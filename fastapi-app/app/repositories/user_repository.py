"""Data-access for User aggregate."""
from typing import Optional

from sqlalchemy import select

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def get_by_email(self, email: str) -> Optional[User]:
        normalized = email.strip().lower()
        return self.db.execute(
            select(User).where(User.email == normalized)
        ).scalar_one_or_none()

    def email_exists(self, email: str) -> bool:
        normalized = email.strip().lower()
        result = self.db.execute(
            select(User.id).where(User.email == normalized).limit(1)
        ).first()
        return result is not None
