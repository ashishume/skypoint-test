"""Candidate profile workflows and job recommendations."""
import re

from app.models.candidate_profile import CandidateProfile
from app.models.job import JobPosting
from app.models.user import User
from app.repositories.candidate_profile_repository import CandidateProfileRepository
from app.repositories.job_repository import JobRepository
from app.schemas.candidate_profile import (
    CandidateProfileResponse,
    CandidateProfileUpdate,
    JobRecommendation,
)
from app.schemas.job import JobResponse


def _split_skills(value: str) -> list[str]:
    return [part.strip() for part in value.split(",") if part.strip()]


def _join_skills(skills: list[str]) -> str:
    return ", ".join(skills)


def _keywords(text: str) -> set[str]:
    stop_words = {
        "and", "the", "for", "with", "from", "this", "that", "your", "you",
        "are", "job", "role", "team", "work", "build", "will", "our",
    }
    return {
        token
        for token in re.findall(r"[a-zA-Z][a-zA-Z0-9+#.-]{1,}", text.lower())
        if token not in stop_words
    }


def _required_experience_years(job: JobPosting) -> int:
    text = f"{job.title} {job.description}".lower()
    if any(term in text for term in ("principal", "staff", "director", "head of")):
        return 8
    if any(term in text for term in ("lead", "manager")):
        return 6
    if "senior" in text or "sr." in text:
        return 4
    if any(term in text for term in ("junior", "intern", "entry")):
        return 0
    return 2


def _salary_score(profile: CandidateProfile, job: JobPosting) -> int:
    if profile.salary_min is None and profile.salary_max is None:
        return 0
    desired_min = profile.salary_min or 0
    desired_max = profile.salary_max or 10_000_000
    job_min = job.salary_min or 0
    job_max = job.salary_max or 10_000_000
    if job_max < desired_min or job_min > desired_max:
        return 0
    if profile.salary_min is not None and job_max >= profile.salary_min:
        return 15
    return 8


class CandidateProfileService:
    def __init__(
        self,
        profile_repo: CandidateProfileRepository,
        job_repo: JobRepository,
    ) -> None:
        self.profile_repo = profile_repo
        self.job_repo = job_repo

    def get_or_create(self, candidate: User) -> CandidateProfile:
        profile = self.profile_repo.get_by_candidate_id(candidate.id)
        if profile is not None:
            return profile
        return self.profile_repo.add(CandidateProfile(candidate_id=candidate.id))

    def get_response(self, candidate: User) -> CandidateProfileResponse:
        return self._to_response(self.get_or_create(candidate))

    def update(self, candidate: User, payload: CandidateProfileUpdate) -> CandidateProfileResponse:
        profile = self.get_or_create(candidate)
        profile.resume_url = str(payload.resume_url) if payload.resume_url else None
        profile.skills = _join_skills(payload.skills)
        profile.work_experience = payload.work_experience.strip()
        profile.salary_min = payload.salary_min
        profile.salary_max = payload.salary_max
        profile.experience_years = payload.experience_years
        profile.preferred_roles = _join_skills(payload.preferred_roles)
        return self._to_response(self.profile_repo.save(profile))

    def recommendations(self, candidate: User, *, limit: int = 6) -> list[JobRecommendation]:
        profile = self.get_or_create(candidate)
        profile_skills = set(_split_skills(profile.skills))
        preferred_roles = set(_split_skills(profile.preferred_roles))
        profile_terms = _keywords(profile.work_experience) | profile_skills | preferred_roles
        jobs = self.job_repo.list_open_jobs(limit=100)
        scored = [
            self._score_job(
                job,
                profile=profile,
                profile_terms=profile_terms,
                profile_skills=profile_skills,
                preferred_roles=preferred_roles,
            )
            for job in jobs
        ]
        scored.sort(key=lambda item: (item.match_score, item.job.created_at), reverse=True)
        return [item for item in scored if item.match_score > 0][:limit]

    def _score_job(
        self,
        job: JobPosting,
        *,
        profile: CandidateProfile,
        profile_terms: set[str],
        profile_skills: set[str],
        preferred_roles: set[str],
    ) -> JobRecommendation:
        job_skills = set(_split_skills(job.skills))
        job_text = f"{job.title} {job.description} {job.skills} {job.location} {job.job_type.value}"
        job_terms = _keywords(job_text)
        matched_skills = sorted(profile_skills & job_skills)
        matched_terms = profile_terms & job_terms
        role_terms = _keywords(" ".join(preferred_roles))
        matched_role_terms = role_terms & _keywords(job.title)
        description_terms = _keywords(profile.work_experience) & job_terms
        score = 0
        if matched_skills:
            skill_overlap = len(matched_skills) / max(len(job_skills), 1)
            score += min(45, round(skill_overlap * 45))
        if description_terms:
            score += min(25, round((len(description_terms) / max(len(_keywords(profile.work_experience)), 1)) * 25))
        elif matched_terms:
            score += min(15, round((len(matched_terms) / max(len(profile_terms), 1)) * 15))
        if matched_role_terms:
            score += min(15, round((len(matched_role_terms) / max(len(role_terms), 1)) * 15))
        required_exp = _required_experience_years(job)
        if profile.experience_years >= required_exp:
            score += 10
        elif required_exp and profile.experience_years >= required_exp - 1:
            score += 5
        score += _salary_score(profile, job)
        score = min(100, score)
        reason = (
            f"Matches {', '.join(matched_skills[:3])}"
            if matched_skills
            else "Matches your profile preferences"
        )
        return JobRecommendation(
            job=JobResponse.model_validate(job),
            match_score=score,
            matched_skills=matched_skills,
            reason=reason,
        )

    def _to_response(self, profile: CandidateProfile) -> CandidateProfileResponse:
        skills = _split_skills(profile.skills)
        preferred_roles = _split_skills(profile.preferred_roles)
        strength = 0
        if profile.resume_url:
            strength += 20
        if skills:
            strength += 25
        if profile.work_experience.strip():
            strength += 25
        if profile.salary_min is not None or profile.salary_max is not None:
            strength += 15
        if profile.experience_years or preferred_roles:
            strength += 15
        return CandidateProfileResponse(
            id=profile.id,
            candidate_id=profile.candidate_id,
            resume_url=profile.resume_url,
            skills=skills,
            work_experience=profile.work_experience,
            salary_min=profile.salary_min,
            salary_max=profile.salary_max,
            experience_years=profile.experience_years,
            preferred_roles=preferred_roles,
            profile_strength=strength,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )
