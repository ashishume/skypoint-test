"""Message business rules for HR/candidate conversations."""
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.user import User
from app.repositories.application_repository import ApplicationRepository
from app.repositories.job_repository import JobRepository
from app.repositories.message_repository import MessageThreadRepository
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
    ) -> None:
        self.message_repo = message_repo
        self.job_repo = job_repo
        self.application_repo = application_repo

    def send_from_hr(self, payload: HrMessageCreate, hr: User) -> MessageThreadResponse:
        body = payload.body.strip()
        if not body:
            raise BadRequestError("Message body cannot be empty.")

        job = self.job_repo.get_or_404(payload.job_id, resource_name="Job posting")
        if job.created_by_id != hr.id:
            raise ForbiddenError("You can only message candidates for your own jobs.")

        application = self.application_repo.get_by_job_and_candidate(
            job_id=payload.job_id,
            candidate_id=payload.candidate_id,
        )
        if application is None:
            raise BadRequestError("This candidate has not applied to the selected job.")

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
