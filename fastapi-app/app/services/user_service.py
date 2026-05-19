"""User-management service: registration."""
from app.config import settings
from app.core.exceptions import ConflictError, ForbiddenError
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserRegister


class UserService:
    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    def register(self, payload: UserRegister) -> User:
        if payload.role == UserRole.HR:
            self._verify_hr_invite(payload.hr_invite_code)

        if self.user_repo.email_exists(payload.email):
            raise ConflictError("An account with this email already exists.")

        user = User(
            email=payload.email.lower(),
            hashed_password=hash_password(payload.password),
            full_name=payload.full_name,
            role=payload.role,
            is_active=True,
        )
        return self.user_repo.add(user)

    @staticmethod
    def _verify_hr_invite(provided: str | None) -> None:
        if not provided or provided != settings.HR_INVITE_CODE:
            raise ForbiddenError(
                "A valid HR invite code is required to register as HR."
            )
