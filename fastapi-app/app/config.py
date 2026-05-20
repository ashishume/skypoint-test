"""Application configuration loaded from environment variables.

All secrets (SECRET_KEY, HR_INVITE_CODE, DB credentials) must be supplied
through environment variables — never hardcoded. Settings are validated on
startup; missing or invalid values cause the application to fail fast.
"""
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            ".env",
            str(Path(__file__).resolve().parents[2] / ".env"),
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_NAME: str = "RecruitFlow"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    SECRET_KEY: str = Field(..., min_length=32, description="JWT signing secret; min 32 chars")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, ge=1, le=1440)
    BCRYPT_ROUNDS: int = Field(default=12, ge=4, le=15)

    DATABASE_URL: str = Field(..., min_length=1)
    DB_POOL_SIZE: int = Field(default=10, ge=1, le=100)
    DB_MAX_OVERFLOW: int = Field(default=20, ge=0, le=100)
    DB_POOL_RECYCLE_SECONDS: int = Field(default=1800, ge=60)
    DB_POOL_TIMEOUT_SECONDS: int = Field(default=30, ge=1)

    HR_INVITE_CODE: str = Field(..., min_length=8, description="Code required to register as HR")

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:80"

    COOKIE_NAME: str = "access_token"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    RATE_LIMIT_AUTH_MAX_REQUESTS: int = Field(default=20, ge=1, le=10_000)
    RATE_LIMIT_AUTH_WINDOW_SECONDS: int = Field(default=60, ge=1, le=3600)

    SEED_DATA: bool = False
    SEED_HR_EMAIL: Optional[str] = None
    SEED_HR_PASSWORD: Optional[str] = None
    SEED_HR_NAME: str = "HR Admin"
    SEED_CANDIDATE_EMAIL: Optional[str] = None
    SEED_CANDIDATE_PASSWORD: Optional[str] = None
    SEED_CANDIDATE_NAME: str = "Test Candidate"

    @field_validator("ALGORITHM")
    @classmethod
    def _validate_algorithm(cls, v: str) -> str:
        allowed = {"HS256", "HS384", "HS512"}
        if v not in allowed:
            raise ValueError(f"ALGORITHM must be one of {allowed}")
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
