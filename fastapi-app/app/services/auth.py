"""Authentication service: password hashing, JWT, user authentication.

- bcrypt with configurable cost factor (default 12) for password storage.
- JWT (HS256/384/512) signed with SECRET_KEY from environment.
- authenticate_user runs a dummy bcrypt verify on unknown emails to keep
  response timing constant and mitigate user enumeration via timing attacks.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Union

import bcrypt
from jose import jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User

_dummy_hash_cache: Optional[bytes] = None


def _dummy_hash() -> bytes:
    """Lazy-init a valid bcrypt hash used to equalize timing on unknown users."""
    global _dummy_hash_cache
    if _dummy_hash_cache is None:
        _dummy_hash_cache = bcrypt.hashpw(
            b"timing-attack-mitigation",
            bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS),
        )
    return _dummy_hash_cache


def hash_password(password: str) -> str:
    """Return a bcrypt hash of the given password."""
    salt = bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Constant-time bcrypt verification. Returns False on any error."""
    if not password or not hashed:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(
    subject: Union[str, int],
    expires_minutes: Optional[int] = None,
    extra_claims: Optional[dict] = None,
) -> str:
    """Issue a signed JWT access token with `sub`, `exp`, `iat`, `type=access`."""
    expires = expires_minutes if expires_minutes is not None else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    now = datetime.now(timezone.utc)
    payload: dict = {
        "sub": str(subject),
        "iat": now,
        "exp": now + timedelta(minutes=expires),
        "type": "access",
    }
    if extra_claims:
        for reserved in ("sub", "exp", "iat", "type"):
            extra_claims.pop(reserved, None)
        payload.update(extra_claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT. Raises jose.JWTError on any failure."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Look up a user by email and verify password. Timing-safe."""
    normalized = email.strip().lower()
    user = db.query(User).filter(User.email == normalized).first()
    if user is None:
        bcrypt.checkpw(password.encode("utf-8"), _dummy_hash())
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user
