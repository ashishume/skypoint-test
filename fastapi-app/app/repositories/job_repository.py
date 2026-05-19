"""Data-access for JobPosting aggregate."""
from typing import List, Optional, Tuple

from sqlalchemy import or_, select

from app.models.job import JobPosting, JobStatus, JobType
from app.repositories.base import BaseRepository


class JobRepository(BaseRepository[JobPosting]):
    model = JobPosting

    def list_jobs(
        self,
        *,
        limit: int,
        offset: int,
        status: Optional[JobStatus] = None,
        location: Optional[str] = None,
        job_type: Optional[JobType] = None,
        search: Optional[str] = None,
        salary_min: Optional[int] = None,
        salary_max: Optional[int] = None,
    ) -> Tuple[List[JobPosting], int]:
        stmt = select(JobPosting).order_by(JobPosting.created_at.desc(), JobPosting.id.desc())
        if status is not None:
            stmt = stmt.where(JobPosting.status == status)
        if location:
            stmt = stmt.where(JobPosting.location.ilike(f"%{location.strip()}%"))
        if job_type is not None:
            stmt = stmt.where(JobPosting.job_type == job_type)
        if search:
            term = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    JobPosting.title.ilike(term),
                    JobPosting.description.ilike(term),
                    JobPosting.skills.ilike(term),
                    JobPosting.location.ilike(term),
                )
            )
        if salary_min is not None:
            stmt = stmt.where(
                or_(JobPosting.salary_max.is_(None), JobPosting.salary_max >= salary_min)
            )
        if salary_max is not None:
            stmt = stmt.where(
                or_(JobPosting.salary_min.is_(None), JobPosting.salary_min <= salary_max)
            )
        return self.paginate(stmt, limit=limit, offset=offset)

    def list_open_jobs(self, *, limit: int = 100) -> List[JobPosting]:
        stmt = (
            select(JobPosting)
            .where(JobPosting.status == JobStatus.OPEN)
            .order_by(JobPosting.created_at.desc(), JobPosting.id.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())
