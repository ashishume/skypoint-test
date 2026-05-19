"""Data-access for candidate profiles."""
from typing import Optional

from sqlalchemy import select

from app.models.candidate_profile import CandidateProfile
from app.repositories.base import BaseRepository


class CandidateProfileRepository(BaseRepository[CandidateProfile]):
    model = CandidateProfile

    def get_by_candidate_id(self, candidate_id: int) -> Optional[CandidateProfile]:
        return self.db.execute(
            select(CandidateProfile).where(CandidateProfile.candidate_id == candidate_id)
        ).scalar_one_or_none()
