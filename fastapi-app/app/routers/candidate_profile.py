"""Candidate profile and recommendation endpoints."""
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query

from app.core.pagination import Page, PaginationParams
from app.dependencies import CandidateProfileServiceDep, CandidateUser
from app.models.job import JobType
from app.schemas.candidate_profile import (
    CandidateProfileResponse,
    CandidateProfileUpdate,
    JobRecommendation,
)

router = APIRouter()


@router.get("/profile", response_model=CandidateProfileResponse)
def get_profile(
    candidate: CandidateUser,
    service: CandidateProfileServiceDep,
) -> CandidateProfileResponse:
    return service.get_response(candidate)


@router.put("/profile", response_model=CandidateProfileResponse)
def update_profile(
    payload: CandidateProfileUpdate,
    candidate: CandidateUser,
    service: CandidateProfileServiceDep,
) -> CandidateProfileResponse:
    return service.update(candidate, payload)


@router.get("/recommendations", response_model=List[JobRecommendation])
def recommendations(
    candidate: CandidateUser,
    service: CandidateProfileServiceDep,
) -> List[JobRecommendation]:
    return service.recommendations(candidate)


@router.get("/job-matches", response_model=Page[JobRecommendation])
def job_matches(
    candidate: CandidateUser,
    service: CandidateProfileServiceDep,
    pagination: Annotated[PaginationParams, Depends()],
    location: Annotated[Optional[str], Query(max_length=255)] = None,
    job_type: Optional[JobType] = None,
    search: Annotated[Optional[str], Query(max_length=255)] = None,
    skill: Annotated[Optional[str], Query(max_length=64)] = None,
    salary_min: Annotated[Optional[int], Query(ge=0, le=10_000_000)] = None,
    salary_max: Annotated[Optional[int], Query(ge=0, le=10_000_000)] = None,
) -> Page[JobRecommendation]:
    return service.matched_jobs(
        candidate,
        pagination,
        location=location,
        job_type=job_type,
        search=search,
        skill=skill,
        salary_min=salary_min,
        salary_max=salary_max,
    )
