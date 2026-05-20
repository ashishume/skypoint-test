"""Application business logic: apply, list, status updates, HR dashboard."""
from datetime import datetime, time, timedelta, timezone
from typing import Optional

from app.core.exceptions import BadRequestError, ConflictError, ForbiddenError
from app.core.pagination import Page, PaginationParams
from app.models.application import Application, ApplicationStatus
from app.models.candidate_profile import CandidateProfile
from app.models.job import JobStatus
from app.models.user import User
from app.repositories.application_repository import ApplicationRepository
from app.repositories.candidate_profile_repository import CandidateProfileRepository
from app.repositories.job_repository import JobRepository
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationWithCandidateProfile,
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
from app.services.candidate_profile_service import CandidateProfileService
from app.services.recommendation import score_job


class ApplicationService:
    def __init__(
        self,
        application_repo: ApplicationRepository,
        job_repo: JobRepository,
        profile_repo: CandidateProfileRepository,
    ) -> None:
        self.application_repo = application_repo
        self.job_repo = job_repo
        self.profile_repo = profile_repo

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
        hr: User,
        pagination: PaginationParams,
        *,
        status: Optional[ApplicationStatus] = None,
    ) -> Page[ApplicationWithCandidateProfile]:
        # Surface a 404 if the job itself doesn't exist (consistent error response).
        job = self.job_repo.get_or_404(job_id, resource_name="Job posting")
        if job.created_by_id != hr.id:
            raise ForbiddenError("You can only view applicants for your own jobs.")
        items, total = self.application_repo.list_for_job(
            job_id=job_id,
            hr_user_id=hr.id,
            limit=pagination.limit,
            offset=pagination.offset,
            status=status,
        )
        return Page[ApplicationWithCandidateProfile].build(
            items=self._with_candidate_profiles(items),
            total=total,
            params=pagination,
        )

    def list_for_hr_jobs(
        self,
        hr: User,
        pagination: PaginationParams,
        *,
        status: Optional[ApplicationStatus] = None,
        job_id: Optional[int] = None,
        search: Optional[str] = None,
    ) -> Page[ApplicationWithCandidateProfile]:
        items, total = self.application_repo.list_for_hr_jobs(
            hr_user_id=hr.id,
            limit=pagination.limit,
            offset=pagination.offset,
            status=status,
            job_id=job_id,
            search=search,
        )
        return Page[ApplicationWithCandidateProfile].build(
            items=self._with_candidate_profiles(items),
            total=total,
            params=pagination,
        )

    def update_status(
        self, application_id: int, new_status: ApplicationStatus, hr: User
    ) -> Application:
        application = self.get(application_id)
        if application.job.created_by_id != hr.id:
            raise ForbiddenError("You can only update applications for your own jobs.")
        if application.status == new_status:
            return application
        application.status = new_status
        return self.application_repo.save(application)

    def hr_dashboard(self, hr: User) -> HrDashboardResponse:
        job_counts = self.job_repo.status_counts(created_by_id=hr.id)
        app_counts = self.application_repo.status_counts(hr_user_id=hr.id)
        total_jobs = sum(job_counts.values())
        total_apps = sum(app_counts.values())
        hiring_velocity = self._hiring_velocity(hr)

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
                for a in self.application_repo.recent(limit=10, hr_user_id=hr.id)
            ],
            hiring_velocity=hiring_velocity,
        )

    def _hiring_velocity(self, hr: User) -> HiringVelocity:
        window_days = 30
        today = datetime.now(timezone.utc).date()
        start_date = today - timedelta(days=window_days - 1)
        since = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
        created_dates = [
            created_at.date()
            for created_at in self.application_repo.created_at_since(since, hr_user_id=hr.id)
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

    def _with_candidate_profiles(
        self, applications: list[Application]
    ) -> list[ApplicationWithCandidateProfile]:
        profiles = self.profile_repo.list_by_candidate_ids(
            [application.candidate_id for application in applications]
        )
        return [
            self._application_profile_response(
                application,
                profiles.get(application.candidate_id),
            )
            for application in applications
        ]

    def _application_profile_response(
        self,
        application: Application,
        profile: CandidateProfile | None,
    ) -> ApplicationWithCandidateProfile:
        profile_response = (
            CandidateProfileService._to_response(profile)
            if profile is not None
            else CandidateProfileService._default_response(application.candidate_id)
        )
        if profile is not None and CandidateProfileService._has_any_signal(profile):
            match = score_job(
                application.job,
                profile=profile,
                profile_skills=profile.skills,
                preferred_roles=profile.preferred_roles,
                application_status=application.status,
            )
            match_score = match.match_score
            matched_skills = match.matched_skills
            match_reason = match.reason
        else:
            match_score = 0
            matched_skills = []
            match_reason = "Candidate profile is incomplete"

        return ApplicationWithCandidateProfile(
            **ApplicationWithJobAndCandidate.model_validate(application).model_dump(),
            candidate_profile=profile_response,
            match_score=match_score,
            matched_skills=matched_skills,
            match_reason=match_reason,
        )
