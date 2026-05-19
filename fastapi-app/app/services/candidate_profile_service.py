"""Candidate profile workflows and job recommendations."""
from typing import List, Optional

from app.models.candidate_profile import CandidateProfile
from app.models.user import User
from app.repositories.candidate_profile_repository import CandidateProfileRepository
from app.repositories.job_repository import JobRepository
from app.schemas.candidate_profile import (
    CandidateProfileResponse,
    CandidateProfileUpdate,
    JobRecommendation,
)
from app.services.recommendation import score_job

_PROFILE_STRENGTH_RESUME = 20
_PROFILE_STRENGTH_SKILLS = 25
_PROFILE_STRENGTH_EXPERIENCE = 25
_PROFILE_STRENGTH_SALARY = 15
_PROFILE_STRENGTH_PREFERENCES = 15


class CandidateProfileService:
    def __init__(
        self,
        profile_repo: CandidateProfileRepository,
        job_repo: JobRepository,
    ) -> None:
        self.profile_repo = profile_repo
        self.job_repo = job_repo

    def get_response(self, candidate: User) -> CandidateProfileResponse:
        """Read-only: return the candidate's profile or a default DTO.

        A profile row is normally created at registration time, but a missing
        row is treated as "empty profile" rather than triggering a write on GET.
        """
        profile = self.profile_repo.get_by_candidate_id(candidate.id)
        if profile is None:
            return self._default_response(candidate.id)
        return self._to_response(profile)

    def update(
        self, candidate: User, payload: CandidateProfileUpdate
    ) -> CandidateProfileResponse:
        profile = self.profile_repo.get_by_candidate_id(candidate.id)
        if profile is None:
            profile = self.profile_repo.add(CandidateProfile(candidate_id=candidate.id))
        profile.resume_url = str(payload.resume_url) if payload.resume_url else None
        profile.skills = list(payload.skills)
        profile.work_experience = payload.work_experience.strip()
        profile.salary_min = payload.salary_min
        profile.salary_max = payload.salary_max
        profile.experience_years = payload.experience_years
        profile.preferred_roles = list(payload.preferred_roles)
        return self._to_response(self.profile_repo.save(profile))

    def recommendations(
        self, candidate: User, *, limit: int = 6
    ) -> List[JobRecommendation]:
        profile = self.profile_repo.get_by_candidate_id(candidate.id)
        if profile is None or not self._has_any_signal(profile):
            return []
        jobs = self.job_repo.list_open_jobs(limit=100)
        scored = [
            score_job(
                job,
                profile=profile,
                profile_skills=profile.skills,
                preferred_roles=profile.preferred_roles,
            )
            for job in jobs
        ]
        scored.sort(key=lambda item: (item.match_score, item.job.created_at), reverse=True)
        return [item for item in scored if item.match_score > 0][:limit]

    @staticmethod
    def _has_any_signal(profile: CandidateProfile) -> bool:
        return bool(
            profile.skills
            or profile.work_experience.strip()
            or profile.salary_min is not None
            or profile.salary_max is not None
            or profile.experience_years
            or profile.preferred_roles
        )

    @classmethod
    def _to_response(cls, profile: CandidateProfile) -> CandidateProfileResponse:
        return CandidateProfileResponse(
            id=profile.id,
            candidate_id=profile.candidate_id,
            resume_url=profile.resume_url,
            skills=list(profile.skills or []),
            work_experience=profile.work_experience,
            salary_min=profile.salary_min,
            salary_max=profile.salary_max,
            experience_years=profile.experience_years,
            preferred_roles=list(profile.preferred_roles or []),
            profile_strength=cls._profile_strength(profile),
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )

    @staticmethod
    def _profile_strength(profile: CandidateProfile) -> int:
        strength = 0
        if profile.resume_url:
            strength += _PROFILE_STRENGTH_RESUME
        if profile.skills:
            strength += _PROFILE_STRENGTH_SKILLS
        if profile.work_experience.strip():
            strength += _PROFILE_STRENGTH_EXPERIENCE
        if profile.salary_min is not None or profile.salary_max is not None:
            strength += _PROFILE_STRENGTH_SALARY
        if profile.experience_years or profile.preferred_roles:
            strength += _PROFILE_STRENGTH_PREFERENCES
        return strength

    @staticmethod
    def _default_response(candidate_id: int) -> CandidateProfileResponse:
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        return CandidateProfileResponse(
            id=0,
            candidate_id=candidate_id,
            resume_url=None,
            skills=[],
            work_experience="",
            salary_min=None,
            salary_max=None,
            experience_years=0,
            preferred_roles=[],
            profile_strength=0,
            created_at=now,
            updated_at=now,
        )
