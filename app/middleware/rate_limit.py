import time

from fastapi import HTTPException, Request
from redis.asyncio import Redis

from app.config import get_settings

settings = get_settings()

# Two Redis clients: one for text (rate limit, state), one for binary (file uploads)
_redis_text: Redis | None = None
_redis_binary: Redis | None = None


async def get_redis() -> Redis:
    """Redis client with decode_responses=True (for rate limiting, state, pub/sub)."""
    global _redis_text
    if _redis_text is None:
        _redis_text = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_text


async def get_redis_binary() -> Redis:
    """Redis client with decode_responses=False (for storing raw file bytes)."""
    global _redis_binary
    if _redis_binary is None:
        _redis_binary = Redis.from_url(settings.redis_url, decode_responses=False)
    return _redis_binary


async def close_redis():
    """Close Redis connections on shutdown."""
    global _redis_text, _redis_binary
    if _redis_text:
        await _redis_text.close()
        _redis_text = None
    if _redis_binary:
        await _redis_binary.close()
        _redis_binary = None


async def rate_limit(request: Request):
    """Rate limiting middleware using Redis sliding window."""
    redis = await get_redis()

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        key = f"rl:auth:{auth_header[7:16]}"
        limit = settings.rate_limit_auth
    else:
        client_ip = request.client.host if request.client else "unknown"
        key = f"rl:anon:{client_ip}"
        limit = settings.rate_limit_anon

    now = time.time()
    window = 60  # 1 minute

    pipe = redis.pipeline()
    pipe.zremrangebyscore(key, 0, now - window)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, window)
    results = await pipe.execute()

    count = results[2]
    if count > limit:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers={"Retry-After": str(window)},
        )
