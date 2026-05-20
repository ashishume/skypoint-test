"""Rate-limit stores used by auth middleware."""
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Protocol

from redis.asyncio import Redis

from app.config import settings


class RateLimitStore(Protocol):
    async def retry_after(self, key: str, *, max_requests: int, window_seconds: int) -> int | None:
        """Return retry-after seconds when a request should be blocked."""

    async def close(self) -> None:
        """Release resources held by the store."""


class MemoryRateLimitStore:
    """In-process fallback used for tests and non-Docker local runs."""

    def __init__(self) -> None:
        self._requests: Dict[str, Deque[float]] = defaultdict(deque)

    async def retry_after(self, key: str, *, max_requests: int, window_seconds: int) -> int | None:
        now = time.monotonic()
        bucket = self._requests[key]

        while bucket and now - bucket[0] >= window_seconds:
            bucket.popleft()

        if len(bucket) >= max_requests:
            return max(1, int(window_seconds - (now - bucket[0])))

        bucket.append(now)
        return None

    async def close(self) -> None:
        self._requests.clear()


class RedisRateLimitStore:
    """Shared Redis-backed fixed-window rate limiter."""

    def __init__(self, redis_url: str) -> None:
        self._redis = Redis.from_url(redis_url, encoding="utf-8", decode_responses=True)

    async def retry_after(self, key: str, *, max_requests: int, window_seconds: int) -> int | None:
        redis_key = f"rate-limit:{key}"
        count = await self._redis.incr(redis_key)
        if count == 1:
            await self._redis.expire(redis_key, window_seconds)

        if count <= max_requests:
            return None

        ttl = await self._redis.ttl(redis_key)
        return max(1, ttl if ttl > 0 else window_seconds)

    async def close(self) -> None:
        await self._redis.aclose()


def build_rate_limit_store() -> RateLimitStore:
    if settings.RATE_LIMIT_STORE == "redis":
        return RedisRateLimitStore(settings.REDIS_URL)
    return MemoryRateLimitStore()
