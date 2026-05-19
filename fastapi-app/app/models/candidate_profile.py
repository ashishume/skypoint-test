"""Candidate profile data used for job recommendations."""
from typing import TYPE_CHECKING, List

from sqlalchemy import JSON, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class CandidateProfile(Base, TimestampMixin):
    __tablename__ = "candidate_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    resume_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # JSON here; production would use JSONB (PostgreSQL) and normalise into a
    # candidate_skills join table for indexed filtering and many-to-many reuse.
    skills: Mapped[List[str]] = mapped_column(
        JSON, nullable=False, default=list, server_default=text("'[]'")
    )
    work_experience: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    experience_years: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    preferred_roles: Mapped[List[str]] = mapped_column(
        JSON, nullable=False, default=list, server_default=text("'[]'")
    )

    candidate: Mapped["User"] = relationship("User", back_populates="candidate_profile")
