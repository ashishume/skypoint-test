"""User-management service: registration."""
from app.config import settings
from app.core.exceptions import ConflictError, ForbiddenError
from app.core.security import hash_password
from app.models.candidate_profile import CandidateProfile
from app.models.user import User, UserRole
from app.repositories.candidate_profile_repository import CandidateProfileRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserRegister


class UserService:
    def __init__(
        self,
        user_repo: UserRepository,
        profile_repo: CandidateProfileRepository,
    ) -> None:
        self.user_repo = user_repo
        self.profile_repo = profile_repo

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
        user = self.user_repo.add(user)

        # Candidates get an empty profile eagerly so GET /candidate/profile
        # is a pure read; HR users have no profile.
        if user.role == UserRole.CANDIDATE:
            self.profile_repo.add(CandidateProfile(candidate_id=user.id))
        return user

    @staticmethod
    def _verify_hr_invite(provided: str | None) -> None:
        if not provided or provided != settings.HR_INVITE_CODE:
            raise ForbiddenError(
                "A valid HR invite code is required to register as HR."
            )
