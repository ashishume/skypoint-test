"""Job posting business logic: CRUD + listing for HR / candidates."""
from typing import Optional

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.core.pagination import Page, PaginationParams
from app.models.job import JobPosting, JobStatus, JobType
from app.models.user import User
from app.repositories.application_repository import ApplicationRepository
from app.repositories.candidate_profile_repository import CandidateProfileRepository
from app.repositories.job_repository import JobRepository
from app.schemas.candidate_profile import PotentialCandidate
from app.schemas.job import JobCreate, JobResponse, JobUpdate
from app.services.candidate_profile_service import CandidateProfileService
from app.services.recommendation import score_job


class JobService:
    def __init__(
        self,
        job_repo: JobRepository,
        profile_repo: CandidateProfileRepository | None = None,
        application_repo: ApplicationRepository | None = None,
    ) -> None:
        self.job_repo = job_repo
        self.profile_repo = profile_repo
        self.application_repo = application_repo

    def create(self, payload: JobCreate, hr_user: User) -> JobPosting:
        job = JobPosting(
            title=payload.title.strip(),
            description=payload.description.strip(),
            skills=list(payload.skills),
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

    def get_for_hr(self, job_id: int, hr_user: User) -> JobPosting:
        job = self.get(job_id)
        if job.created_by_id != hr_user.id:
            raise ForbiddenError("You can only access your own job postings.")
        return job

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
        created_by_id: Optional[int] = None,
        status: Optional[JobStatus] = None,
        location: Optional[str] = None,
        job_type: Optional[JobType] = None,
        search: Optional[str] = None,
        skill: Optional[str] = None,
        salary_min: Optional[int] = None,
        salary_max: Optional[int] = None,
    ) -> Page[JobResponse]:
        items, total = self.job_repo.list_jobs(
            limit=pagination.limit,
            offset=pagination.offset,
            created_by_id=created_by_id,
            status=status,
            location=location,
            job_type=job_type,
            search=search,
            skill=skill,
            salary_min=salary_min,
            salary_max=salary_max,
        )
        return Page[JobResponse].build(
            items=[JobResponse.model_validate(j) for j in items],
            total=total,
            params=pagination,
        )

    def update(self, job_id: int, payload: JobUpdate, hr_user: User) -> JobPosting:
        job = self.get_for_hr(job_id, hr_user)
        data = payload.model_dump(exclude_unset=True)
        next_salary_min = data.get("salary_min", job.salary_min)
        next_salary_max = data.get("salary_max", job.salary_max)
        if (
            next_salary_min is not None
            and next_salary_max is not None
            and next_salary_max < next_salary_min
        ):
            raise BadRequestError("salary_max must be greater than or equal to salary_min")
        for field, value in data.items():
            if field == "skills" and isinstance(value, list):
                value = list(value)
            elif isinstance(value, str):
                value = value.strip()
            setattr(job, field, value)
        return self.job_repo.save(job)

    def delete(self, job_id: int, hr_user: User) -> None:
        job = self.get_for_hr(job_id, hr_user)
        self.job_repo.delete(job)

    def potential_candidates(
        self,
        job_id: int,
        hr_user: User,
        pagination: PaginationParams,
        *,
        search: Optional[str] = None,
    ) -> Page[PotentialCandidate]:
        if self.profile_repo is None or self.application_repo is None:
            raise RuntimeError("Candidate profile and application repositories are required.")

        job = self.get_for_hr(job_id, hr_user)
        profiles = self.profile_repo.list_searchable_candidates(search=search)
        applications_by_candidate = self.application_repo.applications_for_job_candidate_ids(
            job_id=job.id,
            candidate_ids=[profile.candidate_id for profile in profiles],
        )
        candidates = [
            self._potential_candidate_response(job, profile, applications_by_candidate.get(profile.candidate_id))
            for profile in profiles
        ]
        candidates.sort(
            key=lambda candidate: (
                -candidate.match_score,
                -candidate.candidate_profile.profile_strength,
                candidate.candidate.full_name.lower(),
            )
        )
        total = len(candidates)
        page_items = candidates[pagination.offset:pagination.offset + pagination.limit]
        return Page[PotentialCandidate].build(
            items=page_items,
            total=total,
            params=pagination,
        )

    @staticmethod
    def _potential_candidate_response(job: JobPosting, profile, application) -> PotentialCandidate:
        recommendation = score_job(
            job,
            profile=profile,
            profile_skills=profile.skills,
            preferred_roles=profile.preferred_roles,
            application_status=application.status if application is not None else None,
        )
        return PotentialCandidate(
            candidate=profile.candidate,
            candidate_profile=CandidateProfileService._to_response(profile),
            match_score=recommendation.match_score,
            matched_skills=recommendation.matched_skills,
            match_reason=recommendation.reason,
            has_applied=application is not None,
            application_status=application.status if application is not None else None,
            application_id=application.id if application is not None else None,
        )
