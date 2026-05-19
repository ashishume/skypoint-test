"""Pydantic schemas for HR/candidate messages."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.job import JobResponse
from app.schemas.user import UserPublic


class HrMessageCreate(BaseModel):
    candidate_id: int = Field(..., gt=0)
    job_id: int = Field(..., gt=0)
    body: str = Field(..., min_length=1, max_length=5_000)


class MessageReplyCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=5_000)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    thread_id: int
    sender_id: int
    sender: UserPublic
    body: str
    created_at: datetime


class MessageThreadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job: JobResponse
    candidate: UserPublic
    hr: UserPublic
    messages: list[MessageResponse]
    created_at: datetime
    updated_at: datetime
