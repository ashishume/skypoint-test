"""Data-access for candidate profiles."""
from typing import Dict, List, Optional

from sqlalchemy import select

from app.models.candidate_profile import CandidateProfile
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
