"""Schemas for the HR dashboard endpoint."""
from typing import List

from pydantic import BaseModel

from app.schemas.application import ApplicationWithJob


class ApplicationStatusCounts(BaseModel):
    pending: int = 0
    reviewed: int = 0
    shortlisted: int = 0
    rejected: int = 0


class JobStatusCounts(BaseModel):
    open: int = 0
    closed: int = 0


class HrDashboardResponse(BaseModel):
    total_jobs: int
    jobs_by_status: JobStatusCounts
    total_applications: int
    applications_by_status: ApplicationStatusCounts
    recent_applications: List[ApplicationWithJob]
