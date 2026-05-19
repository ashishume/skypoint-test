"""Data-access for JobPosting aggregate."""
from typing import List, Optional, Tuple

from sqlalchemy import select

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
            stmt = stmt.where(JobPosting.title.ilike(term))
        return self.paginate(stmt, limit=limit, offset=offset)
