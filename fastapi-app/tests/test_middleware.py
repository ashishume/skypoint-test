"""Tests for security and rate-limit middleware."""
import asyncio
from types import SimpleNamespace
from unittest.mock import patch

from app.config import settings
from app.core.middleware import AuthRateLimitMiddleware
from app.core.rate_limit import MemoryRateLimitStore, RedisRateLimitStore


def test_security_headers_are_added(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]
    assert response.headers["X-Request-ID"]


def test_request_id_header_is_preserved(client):
    response = client.get("/health", headers={"X-Request-ID": "assessment-request"})

    assert response.headers["X-Request-ID"] == "assessment-request"


def test_docs_csp_allows_swagger_assets(client):
    response = client.get("/api/v1/docs")

    assert response.status_code == 200
    csp = response.headers["Content-Security-Policy"]
    assert "https://cdn.jsdelivr.net" in csp
    assert "'unsafe-inline'" in csp


def test_auth_rate_limiter_returns_retry_after():
    middleware = AuthRateLimitMiddleware(
        app=lambda scope, receive, send: None,
        store=MemoryRateLimitStore(),
    )
    request = SimpleNamespace(
        client=SimpleNamespace(host="127.0.0.1"),
        url=SimpleNamespace(path=f"{settings.API_V1_PREFIX}/auth/login"),
    )

    with patch.object(settings, "RATE_LIMIT_AUTH_MAX_REQUESTS", 2), \
         patch.object(settings, "RATE_LIMIT_AUTH_WINDOW_SECONDS", 60):
        assert asyncio.run(middleware._retry_after(request)) is None
        assert asyncio.run(middleware._retry_after(request)) is None
        retry_after = asyncio.run(middleware._retry_after(request))

    assert retry_after is not None
    assert retry_after > 0


def test_redis_rate_limiter_uses_shared_counter(monkeypatch):
    class FakeRedis:
        def __init__(self):
            self.count = 0
            self.expires = []

        async def incr(self, key):
            self.count += 1
            return self.count

        async def expire(self, key, seconds):
            self.expires.append((key, seconds))

        async def ttl(self, key):
            return 42

        async def aclose(self):
            pass

    fake = FakeRedis()
    monkeypatch.setattr(
        "app.core.rate_limit.Redis.from_url",
        lambda *args, **kwargs: fake,
    )

    store = RedisRateLimitStore("redis://redis:6379/0")

    assert asyncio.run(store.retry_after("client:/api/v1/auth/login", max_requests=2, window_seconds=60)) is None
    assert asyncio.run(store.retry_after("client:/api/v1/auth/login", max_requests=2, window_seconds=60)) is None
    assert asyncio.run(store.retry_after("client:/api/v1/auth/login", max_requests=2, window_seconds=60)) == 42
    assert fake.expires == [("rate-limit:client:/api/v1/auth/login", 60)]
