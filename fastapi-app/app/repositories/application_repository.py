"""Data-access for Application aggregate."""
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from app.models.application import Application, ApplicationStatus
from app.models.job import JobPosting, JobStatus
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

    def list_for_candidate(
        self,
        *,
        candidate_id: int,
        limit: int,
        offset: int,
        status: Optional[ApplicationStatus] = None,
    ) -> Tuple[List[Application], int]:
        stmt = (
            select(Application)
            .options(joinedload(Application.job))
            .where(Application.candidate_id == candidate_id)
            .order_by(Application.created_at.desc(), Application.id.desc())
        )
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

    def job_status_counts(self) -> Dict[JobStatus, int]:
        """Helper used by HR dashboard: count of jobs by status."""
        rows = self.db.execute(
            select(JobPosting.status, func.count(JobPosting.id))
            .group_by(JobPosting.status)
        ).all()
        counts: Dict[JobStatus, int] = {s: 0 for s in JobStatus}
        for status, count in rows:
            counts[status] = int(count)
        return counts
