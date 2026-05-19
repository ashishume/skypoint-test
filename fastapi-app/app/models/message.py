"""Threaded HR/candidate messages tied to a job application."""
from typing import TYPE_CHECKING, List

from sqlalchemy import ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.job import JobPosting
    from app.models.user import User


class MessageThread(Base, TimestampMixin):
    __tablename__ = "message_threads"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(
        ForeignKey("job_postings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    hr_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    job: Mapped["JobPosting"] = relationship("JobPosting")
    candidate: Mapped["User"] = relationship("User", foreign_keys=[candidate_id])
    hr: Mapped["User"] = relationship("User", foreign_keys=[hr_id])
    messages: Mapped[List["Message"]] = relationship(
        "Message",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    __table_args__ = (
        UniqueConstraint("job_id", "candidate_id", "hr_id", name="uq_message_thread_participants"),
        Index("ix_message_threads_candidate_updated", "candidate_id", "updated_at"),
    )


class Message(Base, TimestampMixin):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(
        ForeignKey("message_threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)

    thread: Mapped["MessageThread"] = relationship("MessageThread", back_populates="messages")
    sender: Mapped["User"] = relationship("User")
