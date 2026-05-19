"""Application middleware for lightweight production hardening."""
import time
import uuid
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from app.config import settings


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Ensure every request/response has an X-Request-ID for log correlation."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach conservative browser security headers to every response."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
        )
        if settings.APP_ENV.lower() == "production":
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response


class AuthRateLimitMiddleware(BaseHTTPMiddleware):
    """Small in-memory limiter for auth write endpoints.

    This keeps the assessment self-contained without Redis. In multi-worker
    deployments each worker has its own bucket, so a shared store should replace
    this for high-scale production.
    """

    def __init__(self, app) -> None:
        super().__init__(app)
        self._requests: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        if request.method == "POST" and request.url.path in {
            f"{settings.API_V1_PREFIX}/auth/login",
            f"{settings.API_V1_PREFIX}/auth/register",
        }:
            retry_after = self._retry_after(request)
            if retry_after is not None:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Too many authentication attempts. Please try again shortly."},
                    headers={"Retry-After": str(retry_after)},
                )
        return await call_next(request)

    def _retry_after(self, request: Request) -> int | None:
        now = time.monotonic()
        window = settings.RATE_LIMIT_AUTH_WINDOW_SECONDS
        max_requests = settings.RATE_LIMIT_AUTH_MAX_REQUESTS
        client = request.client.host if request.client else "unknown"
        key = (client, request.url.path)
        bucket = self._requests[key]

        while bucket and now - bucket[0] >= window:
            bucket.popleft()

        if len(bucket) >= max_requests:
            return max(1, int(window - (now - bucket[0])))

        bucket.append(now)
        return None
