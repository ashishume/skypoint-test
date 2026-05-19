"""Schemas for candidate profile and recommendations."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

from app.models.application import ApplicationStatus
from app.schemas.job import JobResponse


def normalize_list(values: List[str]) -> List[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for item in values:
        value = item.strip().lower()
        if value and value not in seen:
            seen.add(value)
            normalized.append(value)
    return normalized


def normalize_skills(skills: List[str]) -> List[str]:
    return normalize_list(skills)


class CandidateProfileUpdate(BaseModel):
    resume_url: Optional[HttpUrl] = None
    skills: List[str] = Field(default_factory=list, max_length=30)
    work_experience: str = Field(default="", max_length=5_000)
    salary_min: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    salary_max: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    experience_years: int = Field(default=0, ge=0, le=60)
    preferred_roles: List[str] = Field(default_factory=list, max_length=20)

    @field_validator("skills")
    @classmethod
    def _normalize_skills(cls, value: List[str]) -> List[str]:
        return normalize_skills(value)

    @field_validator("preferred_roles")
    @classmethod
    def _normalize_preferred_roles(cls, value: List[str]) -> List[str]:
        return normalize_list(value)

    @model_validator(mode="after")
    def _check_salary_range(self) -> "CandidateProfileUpdate":
        if self.salary_min is not None and self.salary_max is not None and self.salary_max < self.salary_min:
            raise ValueError("salary_max must be greater than or equal to salary_min")
        return self


class CandidateProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    candidate_id: int
    resume_url: Optional[str]
    skills: List[str]
    work_experience: str
    salary_min: Optional[int]
    salary_max: Optional[int]
    experience_years: int
    preferred_roles: List[str]
    profile_strength: int
    created_at: datetime
    updated_at: datetime


class JobRecommendation(BaseModel):
    job: JobResponse
    match_score: int
    matched_skills: List[str]
    reason: str
    has_applied: bool = False
    application_status: Optional[ApplicationStatus] = None
