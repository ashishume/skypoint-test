"""Message business rules for HR/candidate conversations."""
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.user import User, UserRole
from app.repositories.application_repository import ApplicationRepository
from app.repositories.job_repository import JobRepository
from app.repositories.message_repository import MessageThreadRepository
from app.repositories.user_repository import UserRepository
from app.schemas.message import (
    HrMessageCreate,
    MessageReplyCreate,
    MessageThreadResponse,
)


class MessageService:
    def __init__(
        self,
        message_repo: MessageThreadRepository,
        job_repo: JobRepository,
        application_repo: ApplicationRepository,
        user_repo: UserRepository,
    ) -> None:
        self.message_repo = message_repo
        self.job_repo = job_repo
        self.application_repo = application_repo
        self.user_repo = user_repo

    def send_from_hr(self, payload: HrMessageCreate, hr: User) -> MessageThreadResponse:
        body = payload.body.strip()
        if not body:
            raise BadRequestError("Message body cannot be empty.")

        job = self.job_repo.get_or_404(payload.job_id, resource_name="Job posting")
        if job.created_by_id != hr.id:
            raise ForbiddenError("You can only message candidates for your own jobs.")

        candidate = self.user_repo.get_or_404(payload.candidate_id, resource_name="Candidate")
        if candidate.role != UserRole.CANDIDATE or not candidate.is_active:
            raise BadRequestError("Messages can only be sent to active candidate users.")

        thread = self.message_repo.get_or_create(
            job_id=payload.job_id,
            candidate_id=payload.candidate_id,
            hr_id=hr.id,
        )
        self.message_repo.add_message(thread=thread, sender_id=hr.id, body=body)
        return self._response(thread.id)

    def list_for_candidate(self, candidate: User) -> list[MessageThreadResponse]:
        return [
            MessageThreadResponse.model_validate(thread)
            for thread in self.message_repo.list_for_candidate(candidate_id=candidate.id)
        ]

    def list_for_hr(self, hr: User) -> list[MessageThreadResponse]:
        return [
            MessageThreadResponse.model_validate(thread)
            for thread in self.message_repo.list_for_hr(hr_id=hr.id)
        ]

    def reply_from_hr(
        self, thread_id: int, payload: MessageReplyCreate, hr: User
    ) -> MessageThreadResponse:
        body = payload.body.strip()
        if not body:
            raise BadRequestError("Message body cannot be empty.")

        thread = self.message_repo.get_with_details(thread_id)
        if thread is None:
            raise NotFoundError(f"Message thread with id {thread_id} not found.")
        if thread.hr_id != hr.id:
            raise ForbiddenError("You can only reply to your own message threads.")

        self.message_repo.add_message(thread=thread, sender_id=hr.id, body=body)
        return self._response(thread.id)

    def reply_from_candidate(
        self, thread_id: int, payload: MessageReplyCreate, candidate: User
    ) -> MessageThreadResponse:
        body = payload.body.strip()
        if not body:
            raise BadRequestError("Message body cannot be empty.")

        thread = self.message_repo.get_with_details(thread_id)
        if thread is None:
            raise NotFoundError(f"Message thread with id {thread_id} not found.")
        if thread.candidate_id != candidate.id:
            raise ForbiddenError("You can only reply to your own messages.")

        self.message_repo.add_message(thread=thread, sender_id=candidate.id, body=body)
        return self._response(thread.id)

    def _response(self, thread_id: int) -> MessageThreadResponse:
        thread = self.message_repo.get_with_details(thread_id)
        if thread is None:
            raise NotFoundError(f"Message thread with id {thread_id} not found.")
        return MessageThreadResponse.model_validate(thread)
