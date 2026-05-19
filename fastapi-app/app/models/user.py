"""User model with role-based access control."""
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, Enum, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.candidate_profile import CandidateProfile
    from app.models.job import JobPosting


class UserRole(str, PyEnum):
    HR = "hr"
    CANDIDATE = "candidate"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, length=20, validate_strings=True),
        nullable=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="1"
    )

    job_postings: Mapped[List["JobPosting"]] = relationship(
        "JobPosting",
        back_populates="created_by",
        cascade="all, delete-orphan",
    )
    applications: Mapped[List["Application"]] = relationship(
        "Application",
        back_populates="candidate",
        cascade="all, delete-orphan",
    )
    candidate_profile: Mapped["CandidateProfile | None"] = relationship(
        "CandidateProfile",
        back_populates="candidate",
        cascade="all, delete-orphan",
        uselist=False,
    )

    __table_args__ = (
        Index("ix_users_role_active", "role", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role.value}>"
