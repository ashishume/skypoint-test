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
        return self._to_response(self.profile_repo.save(profile))

    def recommendations(self, candidate: User, *, limit: int = 6) -> list[JobRecommendation]:
        profile = self.get_or_create(candidate)
        profile_skills = set(_split_skills(profile.skills))
        profile_terms = _keywords(profile.work_experience) | profile_skills
        jobs = self.job_repo.list_open_jobs(limit=100)
        scored = [self._score_job(job, profile_terms, profile_skills) for job in jobs]
        scored.sort(key=lambda item: (item.match_score, item.job.created_at), reverse=True)
        return scored[:limit]

    def _score_job(
        self,
        job: JobPosting,
        profile_terms: set[str],
        profile_skills: set[str],
    ) -> JobRecommendation:
        job_text = f"{job.title} {job.description} {job.location} {job.job_type.value}"
        job_terms = _keywords(job_text)
        matched_skills = sorted(profile_skills & job_terms)
        matched_terms = profile_terms & job_terms
        score = 0
        if profile_terms:
            score = min(100, round((len(matched_terms) / max(len(profile_terms), 1)) * 100))
        if matched_skills:
            score = min(100, score + 20)
        reason = (
            f"Matches {', '.join(matched_skills[:3])}"
            if matched_skills
            else "Recommended from recent open roles"
        )
        return JobRecommendation(
            job=JobResponse.model_validate(job),
            match_score=score,
            matched_skills=matched_skills,
            reason=reason,
        )

    def _to_response(self, profile: CandidateProfile) -> CandidateProfileResponse:
        skills = _split_skills(profile.skills)
        strength = 0
        if profile.resume_url:
            strength += 35
        if skills:
            strength += 30
        if profile.work_experience.strip():
            strength += 35
        return CandidateProfileResponse(
            id=profile.id,
            candidate_id=profile.candidate_id,
            resume_url=profile.resume_url,
            skills=skills,
            work_experience=profile.work_experience,
            profile_strength=strength,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )
