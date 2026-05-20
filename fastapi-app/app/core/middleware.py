"""Application middleware for lightweight production hardening."""
import uuid

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from app.config import settings
from app.core.rate_limit import RateLimitStore


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
        response.headers.setdefault("Content-Security-Policy", self._content_security_policy(request))
        if settings.APP_ENV.lower() == "production":
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response

    @staticmethod
    def _content_security_policy(request: Request) -> str:
        docs_paths = {
            f"{settings.API_V1_PREFIX}/docs",
            f"{settings.API_V1_PREFIX}/redoc",
        }
        if request.url.path in docs_paths:
            return (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data: https://fastapi.tiangolo.com; "
                "font-src 'self' data: https://cdn.jsdelivr.net; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
            )
        return "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'"


class AuthRateLimitMiddleware(BaseHTTPMiddleware):
    """Rate-limit auth write endpoints using the configured shared store."""

    def __init__(self, app, store: RateLimitStore) -> None:
        super().__init__(app)
        self._store = store

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        if request.method == "POST" and request.url.path in {
            f"{settings.API_V1_PREFIX}/auth/login",
            f"{settings.API_V1_PREFIX}/auth/register",
        }:
            retry_after = await self._retry_after(request)
            if retry_after is not None:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Too many authentication attempts. Please try again shortly."},
                    headers={"Retry-After": str(retry_after)},
                )
        return await call_next(request)

    async def _retry_after(self, request: Request) -> int | None:
        client = request.client.host if request.client else "unknown"
        key = f"{client}:{request.url.path}"
        return await self._store.retry_after(
            key,
            max_requests=settings.RATE_LIMIT_AUTH_MAX_REQUESTS,
            window_seconds=settings.RATE_LIMIT_AUTH_WINDOW_SECONDS,
        )
