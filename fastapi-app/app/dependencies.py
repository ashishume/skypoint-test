"""FastAPI dependencies for authenticated access and role enforcement."""
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.services.auth import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login",
    auto_error=False,
)

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    token: Annotated[Optional[str], Depends(oauth2_scheme)] = None,
) -> User:
    """Resolve the authenticated user from a Bearer JWT.

    Rejects: missing/malformed/expired tokens, tokens of the wrong type, tokens
    whose subject is not a valid user id, and tokens for deleted/disabled users.
    """
    if not token:
        raise _CREDENTIALS_EXC

    try:
        payload = decode_access_token(token)
    except JWTError:
        raise _CREDENTIALS_EXC

    if payload.get("type") != "access":
        raise _CREDENTIALS_EXC

    subject = payload.get("sub")
    if not isinstance(subject, str):
        raise _CREDENTIALS_EXC
    try:
        user_id = int(subject)
    except (TypeError, ValueError):
        raise _CREDENTIALS_EXC

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise _CREDENTIALS_EXC

    return user


def require_hr(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if current_user.role != UserRole.HR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires HR privileges.",
        )
    return current_user


def require_candidate(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires a candidate account.",
        )
    return current_user
