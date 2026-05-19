"""Pydantic schemas for application endpoints."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from app.models.application import ApplicationStatus
from app.schemas.job import JobResponse
from app.schemas.user import UserPublic


class ApplicationCreate(BaseModel):
    job_id: int = Field(..., gt=0)
    cover_letter: str = Field(..., min_length=10, max_length=5_000)
    resume_url: Optional[HttpUrl] = None


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    candidate_id: int
    cover_letter: str
    resume_url: Optional[str]
    status: ApplicationStatus
    created_at: datetime
    updated_at: datetime


class ApplicationWithJob(ApplicationResponse):
    """Returned to candidates so they see the job they applied for."""

    job: JobResponse


class ApplicationWithCandidate(ApplicationResponse):
    """Returned to HR so they see who applied."""

    candidate: UserPublic


class ApplicationWithJobAndCandidate(ApplicationWithJob):
    """Returned to HR dashboards so recent applications include context."""

    candidate: UserPublic
