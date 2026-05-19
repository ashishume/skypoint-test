"""Schemas for the HR dashboard endpoint."""
from datetime import date
from typing import List

from pydantic import BaseModel

from app.schemas.application import ApplicationWithJobAndCandidate


class ApplicationStatusCounts(BaseModel):
    pending: int = 0
    reviewed: int = 0
    shortlisted: int = 0
    rejected: int = 0


class JobStatusCounts(BaseModel):
    open: int = 0
    closed: int = 0


class HiringVelocityBucket(BaseModel):
    label: str
    start_date: date
    end_date: date
    applications: int


class HiringVelocity(BaseModel):
    window_days: int
    total_applications: int
    average_weekly_applications: float
    peak_week_label: str
    buckets: List[HiringVelocityBucket]


class HrDashboardResponse(BaseModel):
    total_jobs: int
    jobs_by_status: JobStatusCounts
    total_applications: int
    applications_by_status: ApplicationStatusCounts
    recent_applications: List[ApplicationWithJobAndCandidate]
    hiring_velocity: HiringVelocity
