"""Request/response schemas for authentication endpoints."""
import re
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole
from app.schemas.user import UserResponse

_PASSWORD_PATTERN = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};:,.<>?/\\|`~]).{8,128}$"
)
_PASSWORD_RULE = (
    "Password must be 8-128 characters and include at least one uppercase "
    "letter, one lowercase letter, one digit, and one special character."
)


class _UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)

    @field_validator("full_name")
    @classmethod
    def _strip_full_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("full_name cannot be blank")
        return v


class UserRegister(_UserBase):
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.CANDIDATE
    hr_invite_code: Optional[str] = Field(default=None, max_length=128)

    @field_validator("password")
    @classmethod
    def _validate_password_strength(cls, v: str) -> str:
        if not _PASSWORD_PATTERN.match(v):
            raise ValueError(_PASSWORD_RULE)
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Token lifetime in seconds")
    user: UserResponse
