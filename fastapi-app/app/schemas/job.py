"""Pydantic schemas for job posting endpoints."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.job import JobStatus, JobType


class JobBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=10, max_length=10_000)
    location: str = Field(..., min_length=1, max_length=255)
    job_type: JobType
    salary_min: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    salary_max: Optional[int] = Field(default=None, ge=0, le=10_000_000)


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
    location: Optional[str] = Field(default=None, min_length=1, max_length=255)
    job_type: Optional[JobType] = None
    salary_min: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    salary_max: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    status: Optional[JobStatus] = None

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
    created_at: datetime
    updated_at: datetime
