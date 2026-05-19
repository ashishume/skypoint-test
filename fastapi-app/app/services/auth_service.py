"""Authentication service: login + token issuance."""
from app.config import settings
from app.core.exceptions import UnauthorizedError
from app.core.security import (
    consume_dummy_hash,
    create_access_token,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenResponse
from app.schemas.user import UserResponse

_INVALID_CREDENTIALS = "Incorrect email or password."


class AuthService:
    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    def authenticate(self, email: str, password: str) -> User:
        """Verify credentials. Timing-safe: runs a dummy bcrypt on unknown users."""
        user = self.user_repo.get_by_email(email)
        if user is None:
            consume_dummy_hash(password)
            raise UnauthorizedError(_INVALID_CREDENTIALS)
        if not verify_password(password, user.hashed_password):
            raise UnauthorizedError(_INVALID_CREDENTIALS)
        if not user.is_active:
            raise UnauthorizedError(_INVALID_CREDENTIALS)
        return user

    def login(self, email: str, password: str) -> TokenResponse:
        user = self.authenticate(email, password)
        token = create_access_token(
            subject=user.id,
            extra_claims={"role": user.role.value},
        )
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse.model_validate(user),
        )
