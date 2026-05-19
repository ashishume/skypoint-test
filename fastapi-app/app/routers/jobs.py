"""Job posting endpoints."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status

from app.core.exceptions import ForbiddenError
from app.core.pagination import Page, PaginationParams
from app.dependencies import (
    ApplicationServiceDep,
    CurrentUser,
    HrUser,
    JobServiceDep,
)
from app.models.application import ApplicationStatus
from app.models.job import JobStatus, JobType
from app.models.user import UserRole
from app.schemas.application import ApplicationWithCandidateProfile
from app.schemas.job import JobCreate, JobResponse, JobUpdate

router = APIRouter()


@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new job posting (HR only)",
)
def create_job(
    payload: JobCreate,
    hr: HrUser,
    service: JobServiceDep,
) -> JobResponse:
    job = service.create(payload, hr)
    return JobResponse.model_validate(job)


@router.get(
    "",
    response_model=Page[JobResponse],
    summary="List job postings (candidates see only open jobs)",
)
def list_jobs(
    current_user: CurrentUser,
    service: JobServiceDep,
    pagination: Annotated[PaginationParams, Depends()],
    status_filter: Annotated[Optional[JobStatus], Query(alias="status")] = None,
    location: Annotated[Optional[str], Query(max_length=255)] = None,
    job_type: Optional[JobType] = None,
    search: Annotated[Optional[str], Query(max_length=255)] = None,
    skill: Annotated[Optional[str], Query(max_length=64)] = None,
    salary_min: Annotated[Optional[int], Query(ge=0, le=10_000_000)] = None,
    salary_max: Annotated[Optional[int], Query(ge=0, le=10_000_000)] = None,
) -> Page[JobResponse]:
    effective_status = status_filter
    if current_user.role == UserRole.CANDIDATE:
        # Candidates can never see closed jobs.
        effective_status = JobStatus.OPEN
    return service.list(
        pagination,
        status=effective_status,
        location=location,
        job_type=job_type,
        search=search,
        skill=skill,
        salary_min=salary_min,
        salary_max=salary_max,
    )


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get a single job posting",
)
def get_job(
    job_id: int,
    current_user: CurrentUser,
    service: JobServiceDep,
) -> JobResponse:
    if current_user.role == UserRole.CANDIDATE:
        job = service.get_for_candidate(job_id)
    else:
        job = service.get(job_id)
    return JobResponse.model_validate(job)


@router.put(
    "/{job_id}",
    response_model=JobResponse,
    summary="Update a job posting (HR only)",
)
def update_job(
    job_id: int,
    payload: JobUpdate,
    hr: HrUser,
    service: JobServiceDep,
) -> JobResponse:
    job = service.update(job_id, payload)
    return JobResponse.model_validate(job)


@router.delete(
    "/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a job posting (HR only)",
)
def delete_job(
    job_id: int,
    hr: HrUser,
    service: JobServiceDep,
) -> None:
    service.delete(job_id)


@router.get(
    "/{job_id}/applications",
    response_model=Page[ApplicationWithCandidateProfile],
    summary="List applicants for a job (HR only)",
)
def list_job_applications(
    job_id: int,
    hr: HrUser,
    service: ApplicationServiceDep,
    pagination: Annotated[PaginationParams, Depends()],
    status_filter: Annotated[Optional[ApplicationStatus], Query(alias="status")] = None,
) -> Page[ApplicationWithCandidateProfile]:
    return service.list_for_job(job_id, pagination, status=status_filter)
