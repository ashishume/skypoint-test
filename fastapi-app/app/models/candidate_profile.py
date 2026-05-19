"""Candidate profile data used for job recommendations."""
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
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
    skills: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    work_experience: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    experience_years: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    preferred_roles: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")

    candidate: Mapped["User"] = relationship("User", back_populates="candidate_profile")
