"""Authentication endpoints (HTTP plumbing only)."""
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.dependencies import AuthServiceDep, CurrentUser, UserServiceDep
from app.schemas.auth import TokenResponse, UserLogin, UserRegister
from app.schemas.user import UserResponse

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(payload: UserRegister, service: UserServiceDep) -> UserResponse:
    user = service.register(payload)
    return UserResponse.model_validate(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Exchange email + password for a JWT access token",
)
def login(payload: UserLogin, service: AuthServiceDep) -> TokenResponse:
    return service.login(payload.email, payload.password)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the currently authenticated user",
)
def get_me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)
