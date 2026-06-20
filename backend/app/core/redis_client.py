"""Redis async client: rate limiting, response caching, session caching."""
import json
from datetime import date

import redis.asyncio as aioredis

from app.core.config import settings

_redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.redis_url, encoding="utf-8", decode_responses=True
        )
    return _redis_client


async def check_rate_limit(teacher_id: str) -> bool:
    """True = within limit; False = exceeded. Fails open on Redis error."""
    try:
        r = await get_redis()
        key = f"rl:{teacher_id}:{date.today().isoformat()}"
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, 86400)  # Reset at midnight
        return int(count) <= settings.rate_limit_per_teacher
    except Exception:
        return True  # Never block teacher if Redis is down


async def get_cached_response(cache_key: str) -> dict | None:
    try:
        r = await get_redis()
        raw = await r.get(f"resp:{cache_key}")
        return json.loads(raw) if raw else None
    except Exception:
        return None


async def set_cached_response(key: str, data: dict, ttl: int = 3600) -> None:
    try:
        r = await get_redis()
        await r.setex(f"resp:{key}", ttl, json.dumps(data, ensure_ascii=False))
    except Exception:
        pass  # Best-effort — never crash on cache failure


async def get_session_cache(teacher_id: str) -> list | None:
    try:
        r = await get_redis()
        raw = await r.get(f"sess:{teacher_id}")
        return json.loads(raw) if raw else None
    except Exception:
        return None


async def set_session_cache(teacher_id: str, sessions: list, ttl: int = 3600) -> None:
    try:
        r = await get_redis()
        await r.setex(f"sess:{teacher_id}", ttl, json.dumps(sessions, ensure_ascii=False))
    except Exception:
        pass


async def invalidate_session_cache(teacher_id: str) -> None:
    try:
        r = await get_redis()
        await r.delete(f"sess:{teacher_id}")
    except Exception:
        pass