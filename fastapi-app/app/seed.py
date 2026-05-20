"""Idempotent seeding for development / assessment.

Runs on app startup when SEED_DATA=true. Creates the two assessment users and
enough realistic domain data for a fresh Docker boot to feel alive immediately.
"""
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import hash_password
from app.database import SessionLocal
from app.models.application import Application, ApplicationStatus
from app.models.candidate_profile import CandidateProfile
from app.models.job import JobPosting, JobStatus, JobType
from app.models.message import Message, MessageThread
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

_DEMO_CANDIDATES = [
    {
        "email": "riya.frontend@test.com",
        "full_name": "Riya Sharma",
        "resume_url": "https://example.com/riya-sharma-resume.pdf",
        "skills": ["react", "typescript", "tailwind", "frontend", "accessibility"],
        "work_experience": (
            "Frontend engineer with 4 years of experience building React design systems, "
            "dashboard workflows, accessibility improvements, and performance-focused UI."
        ),
        "salary_min": 95000,
        "salary_max": 150000,
        "experience_years": 4,
        "preferred_roles": ["frontend engineer", "react engineer", "ui engineer"],
    },
    {
        "email": "arjun.data@test.com",
        "full_name": "Arjun Mehta",
        "resume_url": "https://example.com/arjun-mehta-resume.pdf",
        "skills": ["python", "sql", "analytics", "pipelines", "postgresql"],
        "work_experience": (
            "Data engineer focused on SQL modelling, Python ETL, analytics pipelines, "
            "and reporting systems for operational teams."
        ),
        "salary_min": 100000,
        "salary_max": 165000,
        "experience_years": 5,
        "preferred_roles": ["data engineer", "analytics engineer", "etl developer"],
    },
    {
        "email": "meera.design@test.com",
        "full_name": "Meera Iyer",
        "resume_url": "https://example.com/meera-iyer-resume.pdf",
        "skills": ["ux research", "product strategy", "analytics", "figma", "usability testing"],
        "work_experience": (
            "Product designer with 6 years of experience leading UX research, product "
            "strategy, usability testing, and dashboard design for SaaS teams."
        ),
        "salary_min": 125000,
        "salary_max": 185000,
        "experience_years": 6,
        "preferred_roles": ["senior product designer", "ux lead", "product design lead"],
    },
    {
        "email": "kabir.backend@test.com",
        "full_name": "Kabir Khan",
        "resume_url": "https://example.com/kabir-khan-resume.pdf",
        "skills": ["python", "fastapi", "postgresql", "redis", "docker"],
        "work_experience": (
            "Backend engineer experienced in FastAPI services, PostgreSQL schemas, Redis "
            "rate limiting, Docker deployments, and secure API integrations."
        ),
        "salary_min": 110000,
        "salary_max": 190000,
        "experience_years": 5,
        "preferred_roles": ["backend engineer", "api engineer", "platform engineer"],
    },
    {
        "email": "nisha.qa@test.com",
        "full_name": "Nisha Rao",
        "resume_url": "https://example.com/nisha-rao-resume.pdf",
        "skills": ["testing", "automation", "playwright", "typescript", "quality"],
        "work_experience": (
            "QA automation engineer building end-to-end test suites, regression workflows, "
            "and quality gates for web applications."
        ),
        "salary_min": 85000,
        "salary_max": 135000,
        "experience_years": 3,
        "preferred_roles": ["qa automation engineer", "test engineer", "quality engineer"],
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


def _ensure_profile(
    db: Session,
    candidate: User,
    *,
    resume_url: str = "https://example.com/recruitflow-demo-resume.pdf",
    skills: list[str] | None = None,
    work_experience: str | None = None,
    salary_min: int = 120000,
    salary_max: int = 180000,
    experience_years: int = 5,
    preferred_roles: list[str] | None = None,
) -> CandidateProfile:
    existing = db.execute(
        select(CandidateProfile).where(CandidateProfile.candidate_id == candidate.id)
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    profile = CandidateProfile(
        candidate_id=candidate.id,
        resume_url=resume_url,
        skills=skills or ["react", "typescript", "product strategy", "ux research", "analytics"],
        work_experience=work_experience or (
            "Senior product designer with 5 years of experience building hiring, "
            "analytics, and workflow products. Comfortable partnering with engineering "
            "teams on React dashboards, research synthesis, and product strategy."
        ),
        salary_min=salary_min,
        salary_max=salary_max,
        experience_years=experience_years,
        preferred_roles=preferred_roles or ["senior product designer", "product strategy lead", "ux lead"],
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    logger.info("Created demo candidate profile for '%s'.", candidate.email)
    return profile


def _ensure_dummy_candidates(db: Session) -> list[User]:
    candidates: list[User] = []
    for candidate_data in _DEMO_CANDIDATES:
        candidate = _ensure_user(
            db,
            candidate_data["email"],
            "Candidate@1234",
            candidate_data["full_name"],
            UserRole.CANDIDATE,
        )
        if candidate is None:
            continue
        _ensure_profile(
            db,
            candidate,
            resume_url=candidate_data["resume_url"],
            skills=candidate_data["skills"],
            work_experience=candidate_data["work_experience"],
            salary_min=candidate_data["salary_min"],
            salary_max=candidate_data["salary_max"],
            experience_years=candidate_data["experience_years"],
            preferred_roles=candidate_data["preferred_roles"],
        )
        candidates.append(candidate)
    return candidates


def _ensure_job(
    db: Session,
    hr: User,
    *,
    title: str,
    description: str,
    skills: list[str],
    location: str,
    job_type: JobType,
    salary_min: int,
    salary_max: int,
    status: JobStatus = JobStatus.OPEN,
) -> JobPosting:
    existing = db.execute(
        select(JobPosting).where(
            JobPosting.created_by_id == hr.id,
            JobPosting.title == title,
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    job = JobPosting(
        title=title,
        description=description,
        skills=skills,
        location=location,
        job_type=job_type,
        salary_min=salary_min,
        salary_max=salary_max,
        status=status,
        created_by_id=hr.id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info("Created demo job '%s'.", title)
    return job


def _ensure_application(db: Session, job: JobPosting, candidate: User) -> Application:
    existing = db.execute(
        select(Application).where(
            Application.job_id == job.id,
            Application.candidate_id == candidate.id,
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    application = Application(
        job_id=job.id,
        candidate_id=candidate.id,
        cover_letter=(
            "I have shipped product workflows with React, research-driven UX, "
            "and analytics dashboards, and I would be excited to contribute to this team."
        ),
        resume_url="https://example.com/recruitflow-demo-resume.pdf",
        status=ApplicationStatus.REVIEWED,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    logger.info("Created demo application for '%s'.", job.title)
    return application


def _ensure_message_thread(db: Session, job: JobPosting, candidate: User, hr: User) -> None:
    thread = db.execute(
        select(MessageThread).where(
            MessageThread.job_id == job.id,
            MessageThread.candidate_id == candidate.id,
            MessageThread.hr_id == hr.id,
        )
    ).scalar_one_or_none()
    if thread is None:
        thread = MessageThread(job_id=job.id, candidate_id=candidate.id, hr_id=hr.id)
        db.add(thread)
        db.commit()
        db.refresh(thread)

    existing_message = db.execute(
        select(Message).where(
            Message.thread_id == thread.id,
            Message.sender_id == hr.id,
            Message.body == "Thanks for applying. Your portfolio is a strong match for the role.",
        )
    ).scalar_one_or_none()
    if existing_message is not None:
        return

    db.add(
        Message(
            thread_id=thread.id,
            sender_id=hr.id,
            body="Thanks for applying. Your portfolio is a strong match for the role.",
        )
    )
    db.commit()
    logger.info("Created demo recruiter message for '%s'.", candidate.email)


def _ensure_demo_workspace(db: Session, hr: User | None, candidate: User | None) -> None:
    if hr is None or candidate is None:
        logger.info("Skipping demo workspace seed: both HR and Candidate users are required.")
        return

    _ensure_profile(db, candidate)
    designer_job = _ensure_job(
        db,
        hr,
        title="Senior Product Designer",
        description=(
            "Lead product design for recruiter workflows, candidate matching, "
            "and hiring analytics. Partner closely with product and engineering."
        ),
        skills=["product strategy", "ux research", "react", "analytics"],
        location="Remote",
        job_type=JobType.FULL_TIME,
        salary_min=130000,
        salary_max=180000,
    )
    _ensure_job(
        db,
        hr,
        title="Frontend Engineer (React)",
        description=(
            "Build responsive React interfaces for recruitment dashboards, "
            "job search, profile recommendations, and workflow automation."
        ),
        skills=["react", "typescript", "tailwind", "frontend"],
        location="Bangalore",
        job_type=JobType.FULL_TIME,
        salary_min=90000,
        salary_max=150000,
    )
    _ensure_job(
        db,
        hr,
        title="Data Engineer (Contract)",
        description=(
            "Design data pipelines for hiring velocity metrics, candidate insights, "
            "and recruiter reporting."
        ),
        skills=["python", "sql", "analytics", "pipelines"],
        location="Remote",
        job_type=JobType.CONTRACT,
        salary_min=100000,
        salary_max=160000,
    )
    _ensure_application(db, designer_job, candidate)
    _ensure_message_thread(db, designer_job, candidate, hr)
    _ensure_dummy_candidates(db)


def seed_database() -> None:
    if not settings.SEED_DATA:
        logger.info("SEED_DATA is disabled; skipping seeding.")
        return

    db = SessionLocal()
    try:
        hr = _ensure_user(
            db,
            settings.SEED_HR_EMAIL,
            settings.SEED_HR_PASSWORD,
            settings.SEED_HR_NAME,
            UserRole.HR,
        )
        candidate = _ensure_user(
            db,
            settings.SEED_CANDIDATE_EMAIL,
            settings.SEED_CANDIDATE_PASSWORD,
            settings.SEED_CANDIDATE_NAME,
            UserRole.CANDIDATE,
        )
        _ensure_demo_workspace(db, hr, candidate)
    except Exception:
        logger.exception("Seeding failed; rolling back.")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
