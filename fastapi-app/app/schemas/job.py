"""Pydantic schemas for job posting endpoints."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.job import JobStatus, JobType


def normalize_job_skills(value: List[str] | None) -> List[str]:
    if not value:
        return []
    seen: set[str] = set()
    normalized: list[str] = []
    for skill in value:
        item = skill.strip().lower()
        if item and item not in seen:
            seen.add(item)
            normalized.append(item)
    return normalized


class JobBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=10, max_length=10_000)
    skills: List[str] = Field(default_factory=list, max_length=30)
    location: str = Field(..., min_length=1, max_length=255)
    job_type: JobType
    salary_min: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    salary_max: Optional[int] = Field(default=None, ge=0, le=10_000_000)

    @field_validator("skills", mode="before")
    @classmethod
    def _normalize_skills(cls, value: List[str] | None) -> List[str]:
        return normalize_job_skills(value)


class JobCreate(JobBase):
    status: JobStatus = JobStatus.OPEN

    @model_validator(mode="after")
    def _check_salary_range(self) -> "JobCreate":
        if (
            self.salary_min is not None
            and self.salary_max is not None
            and self.salary_max < self.salary_min
        ):
            raise ValueError("salary_max must be greater than or equal to salary_min")
        return self


class JobUpdate(BaseModel):
    """Partial update; any subset of fields may be provided."""

    title: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = Field(default=None, min_length=10, max_length=10_000)
    skills: Optional[List[str]] = Field(default=None, max_length=30)
    location: Optional[str] = Field(default=None, min_length=1, max_length=255)
    job_type: Optional[JobType] = None
    salary_min: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    salary_max: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    status: Optional[JobStatus] = None

    @field_validator("skills", mode="before")
    @classmethod
    def _normalize_skills(cls, value: List[str] | None) -> List[str]:
        return normalize_job_skills(value)

    @model_validator(mode="after")
    def _check_salary_range(self) -> "JobUpdate":
        if (
            self.salary_min is not None
            and self.salary_max is not None
            and self.salary_max < self.salary_min
        ):
            raise ValueError("salary_max must be greater than or equal to salary_min")
        return self


class JobResponse(JobBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: JobStatus
    created_by_id: int
    applications_count: int
    created_at: datetime
    updated_at: datetime
