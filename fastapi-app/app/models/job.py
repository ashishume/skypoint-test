"""Job posting model."""
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import JSON, Enum, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.user import User


class JobType(str, PyEnum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERNSHIP = "internship"


class JobStatus(str, PyEnum):
    OPEN = "open"
    CLOSED = "closed"


class JobPosting(Base, TimestampMixin):
    __tablename__ = "job_postings"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    # JSON here; production would use JSONB (PostgreSQL) and normalise into a
    # job_skills join table for indexed filtering and many-to-many skill reuse.
    skills: Mapped[List[str]] = mapped_column(
        JSON, nullable=False, default=list, server_default=text("'[]'")
    )
    location: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    job_type: Mapped[JobType] = mapped_column(
        Enum(JobType, native_enum=False, length=20, validate_strings=True),
        nullable=False,
    )
    salary_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, native_enum=False, length=20, validate_strings=True),
        nullable=False,
        default=JobStatus.OPEN,
        server_default=JobStatus.OPEN.value,
        index=True,
    )
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_by: Mapped["User"] = relationship("User", back_populates="job_postings")
    applications: Mapped[List["Application"]] = relationship(
        "Application",
        back_populates="job",
        cascade="all, delete-orphan",
    )

    @property
    def applications_count(self) -> int:
        return len(self.applications)

    __table_args__ = (
        Index("ix_job_postings_status_created", "status", "created_at"),
    )
