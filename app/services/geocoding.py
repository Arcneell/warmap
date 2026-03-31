"""Reverse geocoding via Nominatim with Redis caching."""

import json

import httpx
from redis.asyncio import Redis

from app.config import get_settings
from app.middleware.rate_limit import get_redis

settings = get_settings()

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
CACHE_TTL = 86400 * 7  # 7 days


async def reverse_geocode(lat: float, lon: float) -> dict | None:
    """Reverse geocode coordinates to address.

    Results cached in Redis for 7 days to respect Nominatim usage policy.
    """
    # Round to ~11m precision for cache key
    cache_key = f"geo:{lat:.4f}:{lon:.4f}"

    redis = await get_redis()
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                NOMINATIM_URL,
                params={
                    "lat": lat,
                    "lon": lon,
                    "format": "json",
                    "addressdetails": 1,
                    "zoom": 14,
                },
                headers={
                    "User-Agent": "Wardrove/2.0 (wardriving platform)",
                },
            )
            if resp.status_code != 200:
                return None

            data = resp.json()
            result = {
                "display_name": data.get("display_name", ""),
                "country": data.get("address", {}).get("country", ""),
                "country_code": data.get("address", {}).get("country_code", ""),
                "state": data.get("address", {}).get("state", ""),
                "city": data.get("address", {}).get("city")
                    or data.get("address", {}).get("town")
                    or data.get("address", {}).get("village", ""),
                "postcode": data.get("address", {}).get("postcode", ""),
                "road": data.get("address", {}).get("road", ""),
            }

            await redis.setex(cache_key, CACHE_TTL, json.dumps(result))
            return result

    except Exception:
        return None
