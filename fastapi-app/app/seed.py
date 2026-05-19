"""Idempotent user seeding for development / assessment.

Runs on app startup when SEED_DATA=true. Creates the two assessment users
(HR + Candidate). Domain data such as jobs and applications is intentionally
created through the API, not from seed rows.
"""
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import hash_password
from app.database import SessionLocal
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def _ensure_user(
    db: Session,
    email: Optional[str],
    password: Optional[str],
    full_name: str,
    role: UserRole,
) -> Optional[User]:
    if not email or not password:
        logger.warning("Skipping seed for role=%s: missing email or password.", role.value)
        return None
    normalized = email.strip().lower()
    existing = db.execute(select(User).where(User.email == normalized)).scalar_one_or_none()
    if existing is not None:
        logger.info("Seed user '%s' already exists; skipping.", normalized)
        return existing
    user = User(
        email=normalized,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Created seed user '%s' (role=%s).", normalized, role.value)
    return user


def seed_database() -> None:
    if not settings.SEED_DATA:
        logger.info("SEED_DATA is disabled; skipping seeding.")
        return

    db = SessionLocal()
    try:
        _ensure_user(
            db,
            settings.SEED_HR_EMAIL,
            settings.SEED_HR_PASSWORD,
            settings.SEED_HR_NAME,
            UserRole.HR,
        )
        _ensure_user(
            db,
            settings.SEED_CANDIDATE_EMAIL,
            settings.SEED_CANDIDATE_PASSWORD,
            settings.SEED_CANDIDATE_NAME,
            UserRole.CANDIDATE,
        )
    except Exception:
        logger.exception("Seeding failed; rolling back.")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
