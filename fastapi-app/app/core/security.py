"""Pure security utilities: password hashing and JWT encoding/decoding.

These are stateless helpers with no DB dependency. They live in `core/` so
that services and other layers can import them without dragging the auth
service in. The bcrypt cost factor and JWT algorithm/secret are pulled from
settings — never hardcoded.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Union

import bcrypt
from jose import jwt

from app.config import settings

_dummy_hash_cache: Optional[bytes] = None


def _dummy_hash() -> bytes:
    """A valid bcrypt hash used to equalize timing on unknown-user code paths."""
    global _dummy_hash_cache
    if _dummy_hash_cache is None:
        _dummy_hash_cache = bcrypt.hashpw(
            b"timing-attack-mitigation",
            bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS),
        )
    return _dummy_hash_cache


def hash_password(password: str) -> str:
    """Return a salted bcrypt hash of the password."""
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


def consume_dummy_hash(password: str) -> None:
    """Run a bcrypt check against a dummy hash to equalize timing.

    Call this when the user lookup failed — without it, an attacker can
    distinguish 'no such user' (fast) from 'wrong password' (slow).
    """
    try:
        bcrypt.checkpw(password.encode("utf-8"), _dummy_hash())
    except (ValueError, TypeError):
        pass


def create_access_token(
    subject: Union[str, int],
    expires_minutes: Optional[int] = None,
    extra_claims: Optional[dict] = None,
) -> str:
    """Issue a signed JWT with sub, iat, exp, and type=access claims."""
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
