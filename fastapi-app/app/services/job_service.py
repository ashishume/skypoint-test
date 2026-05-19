"""Job posting business logic: CRUD + listing for HR / candidates."""
from typing import Optional

from app.core.exceptions import NotFoundError
from app.core.pagination import Page, PaginationParams
from app.models.job import JobPosting, JobStatus, JobType
from app.models.user import User
from app.repositories.job_repository import JobRepository
from app.schemas.job import JobCreate, JobResponse, JobUpdate


class JobService:
    def __init__(self, job_repo: JobRepository) -> None:
        self.job_repo = job_repo

    def create(self, payload: JobCreate, hr_user: User) -> JobPosting:
        job = JobPosting(
            title=payload.title.strip(),
            description=payload.description.strip(),
            location=payload.location.strip(),
            job_type=payload.job_type,
            salary_min=payload.salary_min,
            salary_max=payload.salary_max,
            status=payload.status,
            created_by_id=hr_user.id,
        )
        return self.job_repo.add(job)

    def get(self, job_id: int) -> JobPosting:
        return self.job_repo.get_or_404(job_id, resource_name="Job posting")

    def get_for_candidate(self, job_id: int) -> JobPosting:
        """Candidates can only see open jobs; closed ones return 404."""
        job = self.get(job_id)
        if job.status != JobStatus.OPEN:
            raise NotFoundError(f"Job posting with id {job_id} not found.")
        return job

    def list(
        self,
        pagination: PaginationParams,
        *,
        status: Optional[JobStatus] = None,
        location: Optional[str] = None,
        job_type: Optional[JobType] = None,
        search: Optional[str] = None,
        salary_min: Optional[int] = None,
        salary_max: Optional[int] = None,
    ) -> Page[JobResponse]:
        items, total = self.job_repo.list_jobs(
            limit=pagination.limit,
            offset=pagination.offset,
            status=status,
            location=location,
            job_type=job_type,
            search=search,
            salary_min=salary_min,
            salary_max=salary_max,
        )
        return Page[JobResponse].build(
            items=[JobResponse.model_validate(j) for j in items],
            total=total,
            params=pagination,
        )

    def update(self, job_id: int, payload: JobUpdate) -> JobPosting:
        job = self.get(job_id)
        data = payload.model_dump(exclude_unset=True)
        for field, value in data.items():
            if isinstance(value, str):
                value = value.strip()
            setattr(job, field, value)
        return self.job_repo.save(job)

    def delete(self, job_id: int) -> None:
        job = self.get(job_id)
        self.job_repo.delete(job)
