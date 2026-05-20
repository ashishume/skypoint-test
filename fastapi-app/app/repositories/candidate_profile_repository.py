"""Data-access for candidate profiles."""
from typing import Dict, List, Optional

from sqlalchemy import String, cast, func, select
from sqlalchemy.orm import joinedload

from app.models.candidate_profile import CandidateProfile
from app.models.user import User, UserRole
from app.repositories.base import BaseRepository


class CandidateProfileRepository(BaseRepository[CandidateProfile]):
    model = CandidateProfile

    def get_by_candidate_id(self, candidate_id: int) -> Optional[CandidateProfile]:
        return self.db.execute(
            select(CandidateProfile).where(CandidateProfile.candidate_id == candidate_id)
        ).scalar_one_or_none()

    def list_by_candidate_ids(
        self, candidate_ids: List[int]
    ) -> Dict[int, CandidateProfile]:
        if not candidate_ids:
            return {}
        profiles = self.db.execute(
            select(CandidateProfile).where(
                CandidateProfile.candidate_id.in_(candidate_ids)
            )
        ).scalars().all()
        return {profile.candidate_id: profile for profile in profiles}

    def list_searchable_candidates(self, *, search: Optional[str] = None) -> List[CandidateProfile]:
        stmt = (
            select(CandidateProfile)
            .join(CandidateProfile.candidate)
            .options(joinedload(CandidateProfile.candidate))
            .where(User.role == UserRole.CANDIDATE, User.is_active.is_(True))
            .order_by(CandidateProfile.updated_at.desc(), CandidateProfile.id.desc())
        )
        normalized = search.strip().lower() if search else ""
        if normalized:
            term = f"%{normalized}%"
            stmt = stmt.where(
                func.lower(User.full_name).like(term)
                | func.lower(User.email).like(term)
                | func.lower(CandidateProfile.work_experience).like(term)
                | func.lower(cast(CandidateProfile.skills, String)).like(term)
                | func.lower(cast(CandidateProfile.preferred_roles, String)).like(term)
            )
        return list(self.db.execute(stmt).scalars().all())
