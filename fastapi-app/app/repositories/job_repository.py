"""Data-access for JobPosting aggregate."""
from typing import Dict, List, Optional, Tuple

from sqlalchemy import String, cast, func, or_, select

from app.models.job import JobPosting, JobStatus, JobType
from app.repositories.base import BaseRepository


class JobRepository(BaseRepository[JobPosting]):
    model = JobPosting

    def list_jobs(
        self,
        *,
        limit: int,
        offset: int,
        created_by_id: Optional[int] = None,
        status: Optional[JobStatus] = None,
        location: Optional[str] = None,
        job_type: Optional[JobType] = None,
        search: Optional[str] = None,
        skill: Optional[str] = None,
        salary_min: Optional[int] = None,
        salary_max: Optional[int] = None,
    ) -> Tuple[List[JobPosting], int]:
        stmt = select(JobPosting).order_by(JobPosting.created_at.desc(), JobPosting.id.desc())
        if created_by_id is not None:
            stmt = stmt.where(JobPosting.created_by_id == created_by_id)
        if status is not None:
            stmt = stmt.where(JobPosting.status == status)
        if location:
            stmt = stmt.where(JobPosting.location.ilike(f"%{location.strip()}%"))
        if job_type is not None:
            stmt = stmt.where(JobPosting.job_type == job_type)
        if search:
            # Free-text search scans text columns and exact JSON skill tokens.
            # The skill branch avoids dirty substring matches like "go" matching
            # "django" while still letting the main search box find skill-only roles.
            term = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    JobPosting.title.ilike(term),
                    JobPosting.description.ilike(term),
                    JobPosting.location.ilike(term),
                    self._skill_match(search),
                )
            )
        if skill:
            stmt = stmt.where(self._skill_match(skill))
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

    def status_counts(self, *, created_by_id: Optional[int] = None) -> Dict[JobStatus, int]:
        """Count jobs grouped by status. Statuses absent from the DB return 0."""
        stmt = select(JobPosting.status, func.count(JobPosting.id))
        if created_by_id is not None:
            stmt = stmt.where(JobPosting.created_by_id == created_by_id)
        rows = self.db.execute(stmt.group_by(JobPosting.status)).all()
        counts: Dict[JobStatus, int] = {s: 0 for s in JobStatus}
        for status, count in rows:
            counts[status] = int(count)
        return counts

    @staticmethod
    def _skill_match(skill: str):
        """Match a JSON-array element exactly (case-insensitive).

        Skills are stored canonicalized to lowercase. JSON.dumps of a string
        list produces tokens like `"react"`, so quoting the search term and
        casting the JSON column to text gives us word-boundary matching
        without a dialect-specific JSON operator. Portable across SQLite
        (tests) and PostgreSQL (prod).
        """
        token = f'"{skill.strip().lower()}"'
        return cast(JobPosting.skills, String).ilike(f"%{token}%")
