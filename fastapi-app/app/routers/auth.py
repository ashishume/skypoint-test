"""Authentication endpoints (HTTP plumbing only)."""
from fastapi import APIRouter, Response, status

from app.config import settings
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
    summary="Exchange credentials for a session cookie (+ token body for Swagger)",
)
def login(payload: UserLogin, response: Response, service: AuthServiceDep) -> TokenResponse:
    result = service.login(payload.email, payload.password)
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=result.access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    return result


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear the session cookie",
)
def logout(response: Response) -> None:
    response.delete_cookie(key=settings.COOKIE_NAME, path="/")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the currently authenticated user",
)
def get_me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)
