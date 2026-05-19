"""Data-access for Application aggregate."""
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import String, cast, func, select
from sqlalchemy.orm import joinedload

from app.models.application import Application, ApplicationStatus
from app.models.candidate_profile import CandidateProfile
from app.models.job import JobPosting, JobStatus
from app.models.user import User
from app.repositories.base import BaseRepository


class ApplicationRepository(BaseRepository[Application]):
    model = Application

    def get_by_job_and_candidate(
        self, job_id: int, candidate_id: int
    ) -> Optional[Application]:
        return self.db.execute(
            select(Application).where(
                Application.job_id == job_id,
                Application.candidate_id == candidate_id,
            )
        ).scalar_one_or_none()

    def statuses_for_candidate_jobs(
        self, *, candidate_id: int, job_ids: List[int]
    ) -> Dict[int, ApplicationStatus]:
        if not job_ids:
            return {}
        rows = self.db.execute(
            select(Application.job_id, Application.status).where(
                Application.candidate_id == candidate_id,
                Application.job_id.in_(job_ids),
            )
        ).all()
        return {int(job_id): status for job_id, status in rows}

    def list_for_candidate(
        self,
        *,
        candidate_id: int,
        limit: int,
        offset: int,
        status: Optional[ApplicationStatus] = None,
        open_jobs_only: bool = False,
    ) -> Tuple[List[Application], int]:
        stmt = (
            select(Application)
            .options(joinedload(Application.job))
            .where(Application.candidate_id == candidate_id)
            .order_by(Application.created_at.desc(), Application.id.desc())
        )
        if open_jobs_only:
            stmt = stmt.join(Application.job).where(JobPosting.status == JobStatus.OPEN)
        if status is not None:
            stmt = stmt.where(Application.status == status)
        return self.paginate(stmt, limit=limit, offset=offset)

    def list_for_job(
        self,
        *,
        job_id: int,
        limit: int,
        offset: int,
        status: Optional[ApplicationStatus] = None,
    ) -> Tuple[List[Application], int]:
        stmt = (
            select(Application)
            .options(joinedload(Application.candidate))
            .where(Application.job_id == job_id)
            .order_by(Application.created_at.desc(), Application.id.desc())
        )
        if status is not None:
            stmt = stmt.where(Application.status == status)
        return self.paginate(stmt, limit=limit, offset=offset)

    def list_for_hr_jobs(
        self,
        *,
        hr_user_id: int,
        limit: int,
        offset: int,
        status: Optional[ApplicationStatus] = None,
        job_id: Optional[int] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Application], int]:
        stmt = (
            select(Application)
            .join(Application.job)
            .join(Application.candidate)
            .options(joinedload(Application.job), joinedload(Application.candidate))
            .where(JobPosting.created_by_id == hr_user_id)
            .order_by(Application.created_at.desc(), Application.id.desc())
        )
        if status is not None:
            stmt = stmt.where(Application.status == status)
        if job_id is not None:
            stmt = stmt.where(Application.job_id == job_id)
        normalized_search = search.strip().lower() if search else ""
        if normalized_search:
            term = f"%{normalized_search}%"
            job_skills_text = func.lower(cast(JobPosting.skills, String))
            profile_skills_text = func.lower(cast(CandidateProfile.skills, String))
            preferred_roles_text = func.lower(cast(CandidateProfile.preferred_roles, String))
            stmt = stmt.where(
                func.lower(User.full_name).like(term)
                | func.lower(User.email).like(term)
                | func.lower(JobPosting.title).like(term)
                | func.lower(JobPosting.location).like(term)
                | func.lower(JobPosting.description).like(term)
                | job_skills_text.like(term)
                | Application.candidate_id.in_(
                    select(CandidateProfile.candidate_id).where(
                        func.lower(CandidateProfile.work_experience).like(term)
                        | profile_skills_text.like(term)
                        | preferred_roles_text.like(term)
                    )
                )
            )
        return self.paginate(stmt, limit=limit, offset=offset)

    def status_counts(self) -> Dict[ApplicationStatus, int]:
        """Return a dict mapping every ApplicationStatus to its count (0 if none)."""
        rows = self.db.execute(
            select(Application.status, func.count(Application.id))
            .group_by(Application.status)
        ).all()
        counts: Dict[ApplicationStatus, int] = {s: 0 for s in ApplicationStatus}
        for status, count in rows:
            counts[status] = int(count)
        return counts

    def total_count(self) -> int:
        return int(self.db.execute(select(func.count(Application.id))).scalar_one())

    def recent(self, *, limit: int = 10) -> List[Application]:
        stmt = (
            select(Application)
            .options(joinedload(Application.job), joinedload(Application.candidate))
            .order_by(Application.created_at.desc(), Application.id.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())

    def created_at_since(self, since: datetime) -> List[datetime]:
        stmt = (
            select(Application.created_at)
            .where(Application.created_at >= since)
            .order_by(Application.created_at.asc(), Application.id.asc())
        )
        return list(self.db.execute(stmt).scalars().all())
