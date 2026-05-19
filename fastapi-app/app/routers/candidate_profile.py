"""Candidate profile and recommendation endpoints."""
from typing import List

from fastapi import APIRouter

from app.dependencies import CandidateProfileServiceDep, CandidateUser
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
