"""Idempotent database seeding for development / assessment.

Runs on app startup when SEED_DATA=true. Creates the two test users (HR +
Candidate) and a handful of sample jobs so the dashboard / job board are
pre-populated. All credentials come from env vars — never hardcoded.
"""
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import hash_password
from app.database import SessionLocal
from app.models.job import JobPosting, JobStatus, JobType
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

_SAMPLE_JOBS = [
    {
        "title": "Senior Backend Engineer",
        "description": (
            "We're hiring a senior backend engineer to design and build "
            "high-throughput services in Python and Go. You'll own systems "
            "end-to-end, mentor mid-level engineers, and drive architecture decisions."
        ),
        "location": "Bangalore, India",
        "job_type": JobType.FULL_TIME,
        "salary_min": 2_400_000,
        "salary_max": 3_600_000,
    },
    {
        "title": "Frontend Engineer (React)",
        "description": (
            "Build delightful, accessible UIs in React + TypeScript. You'll partner "
            "closely with design and product to ship features that thousands of "
            "users rely on every day."
        ),
        "location": "Remote",
        "job_type": JobType.FULL_TIME,
        "salary_min": 1_800_000,
        "salary_max": 2_800_000,
    },
    {
        "title": "DevOps / Platform Engineer",
        "description": (
            "Own our cloud platform on AWS — Kubernetes, Terraform, CI/CD pipelines, "
            "observability. Help engineering teams ship safely and often."
        ),
        "location": "Hyderabad, India",
        "job_type": JobType.FULL_TIME,
        "salary_min": 2_000_000,
        "salary_max": 3_200_000,
    },
    {
        "title": "Product Design Intern",
        "description": (
            "6-month internship working alongside our senior design team on user "
            "research, wireframes, and high-fidelity prototypes. Portfolio required."
        ),
        "location": "Remote",
        "job_type": JobType.INTERNSHIP,
        "salary_min": 40_000,
        "salary_max": 60_000,
    },
    {
        "title": "Data Engineer (Contract)",
        "description": (
            "6-month contract to build out our analytics warehouse on BigQuery + dbt. "
            "Experience with Airflow and event-driven pipelines is a strong plus."
        ),
        "location": "Remote",
        "job_type": JobType.CONTRACT,
        "salary_min": 1_500_000,
        "salary_max": 2_200_000,
    },
]


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


def _ensure_sample_jobs(db: Session, hr_user: User) -> None:
    existing_count = db.execute(select(JobPosting)).first()
    if existing_count is not None:
        logger.info("Sample jobs already present; skipping.")
        return
    for spec in _SAMPLE_JOBS:
        db.add(JobPosting(
            **spec,
            status=JobStatus.OPEN,
            created_by_id=hr_user.id,
        ))
    db.commit()
    logger.info("Seeded %d sample job postings.", len(_SAMPLE_JOBS))


def seed_database() -> None:
    if not settings.SEED_DATA:
        logger.info("SEED_DATA is disabled; skipping seeding.")
        return

    db = SessionLocal()
    try:
        hr_user = _ensure_user(
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
        if hr_user is not None:
            _ensure_sample_jobs(db, hr_user)
    except Exception:
        logger.exception("Seeding failed; rolling back.")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
