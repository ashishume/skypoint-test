"""FastAPI dependency wiring.

Layers are composed here so routers stay declarative:
    router → service → repository → session

The `*Dep` aliases (Annotated[X, Depends(...)]) let routers write
`service: JobServiceDep` instead of repeating Depends boilerplate everywhere.
"""
from typing import Annotated, Optional

from fastapi import Depends, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.database import get_db
from app.models.user import User, UserRole
from app.repositories.application_repository import ApplicationRepository
from app.repositories.candidate_profile_repository import CandidateProfileRepository
from app.repositories.job_repository import JobRepository
from app.repositories.user_repository import UserRepository
from app.services.application_service import ApplicationService
from app.services.auth_service import AuthService
from app.services.candidate_profile_service import CandidateProfileService
from app.services.job_service import JobService
from app.services.user_service import UserService

DbSession = Annotated[Session, Depends(get_db)]

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login",
    auto_error=False,
)
TokenStr = Annotated[Optional[str], Depends(oauth2_scheme)]


def get_user_repository(db: DbSession) -> UserRepository:
    return UserRepository(db)


def get_job_repository(db: DbSession) -> JobRepository:
    return JobRepository(db)


def get_application_repository(db: DbSession) -> ApplicationRepository:
    return ApplicationRepository(db)


def get_candidate_profile_repository(db: DbSession) -> CandidateProfileRepository:
    return CandidateProfileRepository(db)


UserRepoDep = Annotated[UserRepository, Depends(get_user_repository)]
JobRepoDep = Annotated[JobRepository, Depends(get_job_repository)]
ApplicationRepoDep = Annotated[ApplicationRepository, Depends(get_application_repository)]
CandidateProfileRepoDep = Annotated[
    CandidateProfileRepository, Depends(get_candidate_profile_repository)
]


def get_user_service(
    repo: UserRepoDep,
    profile_repo: CandidateProfileRepoDep,
) -> UserService:
    return UserService(repo, profile_repo)


def get_auth_service(repo: UserRepoDep) -> AuthService:
    return AuthService(repo)


def get_job_service(repo: JobRepoDep) -> JobService:
    return JobService(repo)


def get_application_service(
    application_repo: ApplicationRepoDep,
    job_repo: JobRepoDep,
    profile_repo: CandidateProfileRepoDep,
) -> ApplicationService:
    return ApplicationService(application_repo, job_repo, profile_repo)


def get_candidate_profile_service(
    profile_repo: CandidateProfileRepoDep,
    job_repo: JobRepoDep,
    application_repo: ApplicationRepoDep,
) -> CandidateProfileService:
    return CandidateProfileService(profile_repo, job_repo, application_repo)


UserServiceDep = Annotated[UserService, Depends(get_user_service)]
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
JobServiceDep = Annotated[JobService, Depends(get_job_service)]
ApplicationServiceDep = Annotated[ApplicationService, Depends(get_application_service)]
CandidateProfileServiceDep = Annotated[
    CandidateProfileService, Depends(get_candidate_profile_service)
]


def get_current_user(
    user_repo: UserRepoDep,
    token: TokenStr = None,
) -> User:
    """Resolve the authenticated user from a Bearer JWT.

    Rejects missing/malformed/expired/wrong-type tokens, non-integer subjects,
    and tokens that reference deleted or deactivated users.
    """
    if not token:
        raise UnauthorizedError("Could not validate credentials.")

    try:
        payload = decode_access_token(token)
    except JWTError:
        raise UnauthorizedError("Could not validate credentials.")

    if payload.get("type") != "access":
        raise UnauthorizedError("Could not validate credentials.")

    subject = payload.get("sub")
    if not isinstance(subject, str):
        raise UnauthorizedError("Could not validate credentials.")
    try:
        user_id = int(subject)
    except (TypeError, ValueError):
        raise UnauthorizedError("Could not validate credentials.")

    user = user_repo.get(user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("Could not validate credentials.")

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_hr(current_user: CurrentUser) -> User:
    if current_user.role != UserRole.HR:
        raise ForbiddenError("This action requires HR privileges.")
    return current_user


def require_candidate(current_user: CurrentUser) -> User:
    if current_user.role != UserRole.CANDIDATE:
        raise ForbiddenError("This action requires a candidate account.")
    return current_user


HrUser = Annotated[User, Depends(require_hr)]
CandidateUser = Annotated[User, Depends(require_candidate)]
