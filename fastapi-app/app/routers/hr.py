"""HR-specific endpoints (dashboard stats)."""
from fastapi import APIRouter

from app.dependencies import ApplicationServiceDep, HrUser
from app.schemas.dashboard import HrDashboardResponse

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=HrDashboardResponse,
    summary="HR dashboard: aggregate counts + recent applications",
)
def hr_dashboard(
    hr: HrUser,
    service: ApplicationServiceDep,
) -> HrDashboardResponse:
    return service.hr_dashboard(hr)
