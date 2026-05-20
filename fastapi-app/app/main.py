"""FastAPI application factory, lifespan, and global error handlers."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.core.exceptions import DomainError, UnauthorizedError
from app.core.middleware import (
    AuthRateLimitMiddleware,
    RequestIdMiddleware,
    SecurityHeadersMiddleware,
)
from app.core.rate_limit import build_rate_limit_store
from app.database import engine
from app.routers import applications as applications_router
from app.routers import auth as auth_router
from app.routers import candidate_profile as candidate_profile_router
from app.routers import hr as hr_router
from app.routers import jobs as jobs_router
from app.routers import messages as messages_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s (env=%s)", settings.APP_NAME, settings.APP_ENV)
    try:
        yield
    finally:
        logger.info("Shutting down %s", settings.APP_NAME)
        await app.state.rate_limit_store.close()
        engine.dispose()


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        lifespan=lifespan,
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        docs_url=f"{settings.API_V1_PREFIX}/docs",
        redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    application.state.rate_limit_store = build_rate_limit_store()
    application.add_middleware(AuthRateLimitMiddleware, store=application.state.rate_limit_store)
    application.add_middleware(RequestIdMiddleware)
    application.add_middleware(SecurityHeadersMiddleware)

    _register_exception_handlers(application)
    _register_routers(application)

    @application.get("/health", tags=["Health"])
    def health() -> dict:
        return {"status": "healthy", "service": settings.APP_NAME}

    return application


def _register_exception_handlers(application: FastAPI) -> None:
    @application.exception_handler(DomainError)
    async def _domain_error_handler(request: Request, exc: DomainError):
        headers = {}
        if isinstance(exc, UnauthorizedError):
            headers["WWW-Authenticate"] = "Bearer"
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message},
            headers=headers,
        )

    @application.exception_handler(SQLAlchemyError)
    async def _db_error_handler(request: Request, exc: SQLAlchemyError):
        logger.exception("Database error at %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal database error occurred."},
        )

    @application.exception_handler(RequestValidationError)
    async def _validation_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": jsonable_encoder(exc.errors())},
        )


def _register_routers(application: FastAPI) -> None:
    prefix = settings.API_V1_PREFIX
    application.include_router(auth_router.router, prefix=f"{prefix}/auth", tags=["Authentication"])
    application.include_router(jobs_router.router, prefix=f"{prefix}/jobs", tags=["Jobs"])
    application.include_router(
        applications_router.router, prefix=f"{prefix}/applications", tags=["Applications"]
    )
    application.include_router(
        candidate_profile_router.router, prefix=f"{prefix}/candidate", tags=["Candidate Profile"]
    )
    application.include_router(messages_router.router, prefix=f"{prefix}/messages", tags=["Messages"])
    application.include_router(hr_router.router, prefix=f"{prefix}/hr", tags=["HR Dashboard"])


app = create_app()
