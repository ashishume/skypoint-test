"""Application business logic: apply, list, status updates, HR dashboard."""
from datetime import datetime, time, timedelta, timezone
from typing import Optional

from app.core.exceptions import BadRequestError, ConflictError
from app.core.pagination import Page, PaginationParams
from app.models.application import Application, ApplicationStatus
from app.models.job import JobStatus
from app.models.user import User
from app.repositories.application_repository import ApplicationRepository
from app.repositories.job_repository import JobRepository
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationWithCandidate,
    ApplicationWithJobAndCandidate,
    ApplicationWithJob,
)
from app.schemas.dashboard import (
    ApplicationStatusCounts,
    HiringVelocity,
    HiringVelocityBucket,
    HrDashboardResponse,
    JobStatusCounts,
)


class ApplicationService:
    def __init__(
        self,
        application_repo: ApplicationRepository,
        job_repo: JobRepository,
    ) -> None:
        self.application_repo = application_repo
        self.job_repo = job_repo

    def apply(self, payload: ApplicationCreate, candidate: User) -> Application:
        job = self.job_repo.get_or_404(payload.job_id, resource_name="Job posting")
        if job.status != JobStatus.OPEN:
            raise BadRequestError("This job is no longer accepting applications.")

        existing = self.application_repo.get_by_job_and_candidate(
            job_id=payload.job_id, candidate_id=candidate.id
        )
        if existing is not None:
            raise ConflictError("You have already applied to this job.")

        application = Application(
            job_id=payload.job_id,
            candidate_id=candidate.id,
            cover_letter=payload.cover_letter.strip(),
            resume_url=str(payload.resume_url) if payload.resume_url else None,
            status=ApplicationStatus.PENDING,
        )
        return self.application_repo.add(application)

    def get(self, application_id: int) -> Application:
        return self.application_repo.get_or_404(
            application_id, resource_name="Application"
        )

    def list_for_candidate(
        self,
        candidate: User,
        pagination: PaginationParams,
        *,
        status: Optional[ApplicationStatus] = None,
        open_jobs_only: bool = False,
    ) -> Page[ApplicationWithJob]:
        items, total = self.application_repo.list_for_candidate(
            candidate_id=candidate.id,
            limit=pagination.limit,
            offset=pagination.offset,
            status=status,
            open_jobs_only=open_jobs_only,
        )
        return Page[ApplicationWithJob].build(
            items=[ApplicationWithJob.model_validate(a) for a in items],
            total=total,
            params=pagination,
        )

    def list_for_job(
        self,
        job_id: int,
        pagination: PaginationParams,
        *,
        status: Optional[ApplicationStatus] = None,
    ) -> Page[ApplicationWithCandidate]:
        # Surface a 404 if the job itself doesn't exist (consistent error response).
        self.job_repo.get_or_404(job_id, resource_name="Job posting")
        items, total = self.application_repo.list_for_job(
            job_id=job_id,
            limit=pagination.limit,
            offset=pagination.offset,
            status=status,
        )
        return Page[ApplicationWithCandidate].build(
            items=[ApplicationWithCandidate.model_validate(a) for a in items],
            total=total,
            params=pagination,
        )

    def update_status(
        self, application_id: int, new_status: ApplicationStatus
    ) -> Application:
        application = self.get(application_id)
        if application.status == new_status:
            return application
        application.status = new_status
        return self.application_repo.save(application)

    def hr_dashboard(self) -> HrDashboardResponse:
        job_counts = self.job_repo.status_counts()
        app_counts = self.application_repo.status_counts()
        total_jobs = sum(job_counts.values())
        total_apps = sum(app_counts.values())
        hiring_velocity = self._hiring_velocity()

        return HrDashboardResponse(
            total_jobs=total_jobs,
            jobs_by_status=JobStatusCounts(
                open=job_counts.get(JobStatus.OPEN, 0),
                closed=job_counts.get(JobStatus.CLOSED, 0),
            ),
            total_applications=total_apps,
            applications_by_status=ApplicationStatusCounts(
                pending=app_counts.get(ApplicationStatus.PENDING, 0),
                reviewed=app_counts.get(ApplicationStatus.REVIEWED, 0),
                shortlisted=app_counts.get(ApplicationStatus.SHORTLISTED, 0),
                rejected=app_counts.get(ApplicationStatus.REJECTED, 0),
            ),
            recent_applications=[
                ApplicationWithJobAndCandidate.model_validate(a)
                for a in self.application_repo.recent(limit=10)
            ],
            hiring_velocity=hiring_velocity,
        )

    def _hiring_velocity(self) -> HiringVelocity:
        window_days = 30
        today = datetime.now(timezone.utc).date()
        start_date = today - timedelta(days=window_days - 1)
        since = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
        created_dates = [
            created_at.date()
            for created_at in self.application_repo.created_at_since(since)
        ]

        bucket_spans = [9, 7, 7, 7]
        buckets: list[HiringVelocityBucket] = []
        cursor = start_date
        for index, span in enumerate(bucket_spans, start=1):
            bucket_start = cursor
            bucket_end = min(today, cursor + timedelta(days=span - 1))
            applications = sum(
                1 for created_date in created_dates
                if bucket_start <= created_date <= bucket_end
            )
            buckets.append(
                HiringVelocityBucket(
                    label=f"Week {index}",
                    start_date=bucket_start,
                    end_date=bucket_end,
                    applications=applications,
                )
            )
            cursor = bucket_end + timedelta(days=1)

        total = sum(bucket.applications for bucket in buckets)
        peak_bucket = max(buckets, key=lambda bucket: bucket.applications)
        return HiringVelocity(
            window_days=window_days,
            total_applications=total,
            average_weekly_applications=round(total / len(buckets), 1),
            peak_week_label=peak_bucket.label,
            buckets=buckets,
        )
