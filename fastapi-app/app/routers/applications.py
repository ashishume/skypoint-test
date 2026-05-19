"""Application endpoints (apply, list own, update status)."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status

from app.core.pagination import Page, PaginationParams
from app.dependencies import (
    ApplicationServiceDep,
    CandidateUser,
    HrUser,
)
from app.models.application import ApplicationStatus
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    ApplicationWithJob,
)

router = APIRouter()


@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Apply to a job (candidate only)",
)
def apply_to_job(
    payload: ApplicationCreate,
    candidate: CandidateUser,
    service: ApplicationServiceDep,
) -> ApplicationResponse:
    application = service.apply(payload, candidate)
    return ApplicationResponse.model_validate(application)


@router.get(
    "/my",
    response_model=Page[ApplicationWithJob],
    summary="List the current candidate's own applications",
)
def list_my_applications(
    candidate: CandidateUser,
    service: ApplicationServiceDep,
    pagination: Annotated[PaginationParams, Depends()],
    status_filter: Annotated[Optional[ApplicationStatus], Query(alias="status")] = None,
) -> Page[ApplicationWithJob]:
    return service.list_for_candidate(candidate, pagination, status=status_filter)


@router.patch(
    "/{application_id}/status",
    response_model=ApplicationResponse,
    summary="Update an application's status (HR only)",
)
def update_application_status(
    application_id: int,
    payload: ApplicationStatusUpdate,
    hr: HrUser,
    service: ApplicationServiceDep,
) -> ApplicationResponse:
    application = service.update_status(application_id, payload.status)
    return ApplicationResponse.model_validate(application)
