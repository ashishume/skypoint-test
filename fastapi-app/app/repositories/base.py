"""Generic repository with common CRUD + pagination helpers.

Subclasses set `model` and add domain-specific queries. The base never reaches
into application logic — it only knows how to read/write rows. Services
coordinate multiple repository calls; repositories commit per operation so
each write is atomic at the row level.
"""
from typing import Generic, List, Optional, Tuple, Type, TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Shared CRUD operations. Subclasses must set the `model` class attribute."""

    model: Type[ModelT]

    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, obj_id: int) -> Optional[ModelT]:
        return self.db.get(self.model, obj_id)

    def get_or_404(self, obj_id: int, *, resource_name: Optional[str] = None) -> ModelT:
        obj = self.get(obj_id)
        if obj is None:
            name = resource_name or self.model.__name__
            raise NotFoundError(f"{name} with id {obj_id} not found.")
        return obj

    def add(self, obj: ModelT) -> ModelT:
        """Persist a new row (commit + refresh)."""
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def save(self, obj: ModelT) -> ModelT:
        """Commit pending changes to an attached object."""
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, obj: ModelT) -> None:
        self.db.delete(obj)
        self.db.commit()

    def paginate(self, stmt: Select, *, limit: int, offset: int) -> Tuple[List[ModelT], int]:
        """Run COUNT(*) on the unpaginated query, then fetch the page.

        We strip ORDER BY for the COUNT to avoid an unnecessary sort, and wrap
        in a subquery so any GROUP BY / DISTINCT in the original is preserved.
        """
        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = self.db.execute(count_stmt).scalar_one()
        items = self.db.execute(stmt.limit(limit).offset(offset)).scalars().all()
        return list(items), int(total)
