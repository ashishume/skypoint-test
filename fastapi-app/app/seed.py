"""Idempotent database seeding for development / assessment.

Only runs when SEED_DATA=true in the environment. Credentials come from env
variables so no test passwords are baked into source.
"""
import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.services.auth import hash_password

logger = logging.getLogger(__name__)


def _ensure_user(
    db: Session,
    email: Optional[str],
    password: Optional[str],
    full_name: str,
    role: UserRole,
) -> None:
    if not email or not password:
        logger.warning("Skipping seed for role=%s: missing email or password.", role.value)
        return
    normalized = email.strip().lower()
    existing = db.query(User).filter(User.email == normalized).first()
    if existing is not None:
        logger.info("Seed user '%s' already exists; skipping.", normalized)
        return
    db.add(User(
        email=normalized,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
        is_active=True,
    ))
    db.commit()
    logger.info("Created seed user '%s' (role=%s).", normalized, role.value)


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
