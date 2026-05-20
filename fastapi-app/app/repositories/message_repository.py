"""Data access for job-scoped HR/candidate message threads."""
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.message import Message, MessageThread
from app.repositories.base import BaseRepository


class MessageThreadRepository(BaseRepository[MessageThread]):
    model = MessageThread

    def get_with_details(self, thread_id: int) -> Optional[MessageThread]:
        return self.db.execute(
            select(MessageThread)
            .options(
                selectinload(MessageThread.job),
                selectinload(MessageThread.candidate),
                selectinload(MessageThread.hr),
                selectinload(MessageThread.messages).selectinload(Message.sender),
            )
            .where(MessageThread.id == thread_id)
            .execution_options(populate_existing=True)
        ).scalar_one_or_none()

    def get_for_participants(
        self, *, job_id: int, candidate_id: int, hr_id: int
    ) -> Optional[MessageThread]:
        return self.db.execute(
            select(MessageThread)
            .where(
                MessageThread.job_id == job_id,
                MessageThread.candidate_id == candidate_id,
                MessageThread.hr_id == hr_id,
            )
        ).scalar_one_or_none()

    def get_or_create(
        self, *, job_id: int, candidate_id: int, hr_id: int
    ) -> MessageThread:
        thread = self.get_for_participants(
            job_id=job_id,
            candidate_id=candidate_id,
            hr_id=hr_id,
        )
        if thread is not None:
            return thread

        thread = MessageThread(job_id=job_id, candidate_id=candidate_id, hr_id=hr_id)
        self.db.add(thread)
        self.db.commit()
        self.db.refresh(thread)
        return thread

    def list_for_candidate(self, *, candidate_id: int) -> List[MessageThread]:
        return list(
            self.db.execute(
                select(MessageThread)
                .options(
                    selectinload(MessageThread.job),
                    selectinload(MessageThread.candidate),
                    selectinload(MessageThread.hr),
                    selectinload(MessageThread.messages).selectinload(Message.sender),
                )
                .where(MessageThread.candidate_id == candidate_id)
                .order_by(MessageThread.updated_at.desc(), MessageThread.id.desc())
            )
            .scalars()
            .all()
        )

    def list_for_hr(self, *, hr_id: int) -> List[MessageThread]:
        return list(
            self.db.execute(
                select(MessageThread)
                .options(
                    selectinload(MessageThread.job),
                    selectinload(MessageThread.candidate),
                    selectinload(MessageThread.hr),
                    selectinload(MessageThread.messages).selectinload(Message.sender),
                )
                .where(MessageThread.hr_id == hr_id)
                .order_by(MessageThread.updated_at.desc(), MessageThread.id.desc())
            )
            .scalars()
            .all()
        )

    def add_message(self, *, thread: MessageThread, sender_id: int, body: str) -> Message:
        message = Message(thread_id=thread.id, sender_id=sender_id, body=body.strip())
        thread.updated_at = datetime.now(timezone.utc)
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        self.db.expire(thread, ["messages", "updated_at"])
        return message
