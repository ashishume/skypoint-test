"""Schemas for candidate profile and recommendations."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.schemas.job import JobResponse


def normalize_skills(skills: List[str]) -> List[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for skill in skills:
        value = skill.strip().lower()
        if value and value not in seen:
            seen.add(value)
            normalized.append(value)
    return normalized


class CandidateProfileUpdate(BaseModel):
    resume_url: Optional[HttpUrl] = None
    skills: List[str] = Field(default_factory=list, max_length=30)
    work_experience: str = Field(default="", max_length=5_000)

    @field_validator("skills")
    @classmethod
    def _normalize_skills(cls, value: List[str]) -> List[str]:
        return normalize_skills(value)


class CandidateProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    candidate_id: int
    resume_url: Optional[str]
    skills: List[str]
    work_experience: str
    profile_strength: int
    created_at: datetime
    updated_at: datetime


class JobRecommendation(BaseModel):
    job: JobResponse
    match_score: int
    matched_skills: List[str]
    reason: str
