"""Tests for security and rate-limit middleware."""
from types import SimpleNamespace
from unittest.mock import patch

from app.config import settings
from app.core.middleware import AuthRateLimitMiddleware


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


def test_auth_rate_limiter_returns_retry_after():
    middleware = AuthRateLimitMiddleware(app=lambda scope, receive, send: None)
    request = SimpleNamespace(
        client=SimpleNamespace(host="127.0.0.1"),
        url=SimpleNamespace(path=f"{settings.API_V1_PREFIX}/auth/login"),
    )

    with patch.object(settings, "RATE_LIMIT_AUTH_MAX_REQUESTS", 2), \
         patch.object(settings, "RATE_LIMIT_AUTH_WINDOW_SECONDS", 60):
        assert middleware._retry_after(request) is None
        assert middleware._retry_after(request) is None
        retry_after = middleware._retry_after(request)

    assert retry_after is not None
    assert retry_after > 0
