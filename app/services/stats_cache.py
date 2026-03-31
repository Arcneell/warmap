"""Redis-cached stats for expensive queries."""

import json
from functools import wraps

from app.middleware.rate_limit import get_redis

DEFAULT_TTL = 300  # 5 minutes


async def cached_stats(key: str, ttl: int = DEFAULT_TTL):
    """Get cached stats value. Returns None if not cached."""
    redis = await get_redis()
    val = await redis.get(f"stats:{key}")
    if val:
        return json.loads(val)
    return None


async def set_cached_stats(key: str, value, ttl: int = DEFAULT_TTL):
    """Cache stats value."""
    redis = await get_redis()
    await redis.setex(f"stats:{key}", ttl, json.dumps(value))


async def invalidate_stats(key: str | None = None):
    """Invalidate cached stats. If key is None, invalidate all."""
    redis = await get_redis()
    if key:
        await redis.delete(f"stats:{key}")
    else:
        # Scan and delete all stats keys
        cursor = 0
        while True:
            cursor, keys = await redis.scan(cursor, match="stats:*", count=100)
            if keys:
                await redis.delete(*keys)
            if cursor == 0:
                break
