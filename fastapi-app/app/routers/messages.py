"""Message endpoints for HR/candidate communication."""
from fastapi import APIRouter, status

from app.dependencies import CandidateUser, HrUser, MessageServiceDep
from app.schemas.message import (
    HrMessageCreate,
    MessageReplyCreate,
    MessageThreadResponse,
)

router = APIRouter()


@router.post(
    "/hr",
    response_model=MessageThreadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a message to a candidate for a job application (HR only)",
)
def send_candidate_message(
    payload: HrMessageCreate,
    hr: HrUser,
    service: MessageServiceDep,
) -> MessageThreadResponse:
    return service.send_from_hr(payload, hr)


@router.get(
    "/hr",
    response_model=list[MessageThreadResponse],
    summary="List the current HR user's job message threads",
)
def list_hr_messages(
    hr: HrUser,
    service: MessageServiceDep,
) -> list[MessageThreadResponse]:
    return service.list_for_hr(hr)


@router.post(
    "/hr/{thread_id}/reply",
    response_model=MessageThreadResponse,
    summary="Reply to a message thread (HR only)",
)
def hr_reply_to_thread(
    thread_id: int,
    payload: MessageReplyCreate,
    hr: HrUser,
    service: MessageServiceDep,
) -> MessageThreadResponse:
    return service.reply_from_hr(thread_id, payload, hr)


@router.get(
    "/candidate",
    response_model=list[MessageThreadResponse],
    summary="List the current candidate's job message threads",
)
def list_candidate_messages(
    candidate: CandidateUser,
    service: MessageServiceDep,
) -> list[MessageThreadResponse]:
    return service.list_for_candidate(candidate)


@router.post(
    "/candidate/{thread_id}/reply",
    response_model=MessageThreadResponse,
    summary="Reply to a message thread (candidate only)",
)
def reply_to_thread(
    thread_id: int,
    payload: MessageReplyCreate,
    candidate: CandidateUser,
    service: MessageServiceDep,
) -> MessageThreadResponse:
    return service.reply_from_candidate(thread_id, payload, candidate)
