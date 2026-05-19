"""Pagination primitives shared across all list endpoints.

`PaginationParams` is a FastAPI dependency that parses limit/offset query
params with safe bounds (max 100 per page). `Page[T]` is the generic envelope
returned by every paginated endpoint.
"""
from typing import Generic, List, TypeVar

from fastapi import Query
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class PaginationParams:
    """Inject as `Annotated[PaginationParams, Depends()]` in routes."""

    def __init__(
        self,
        limit: int = Query(20, ge=1, le=100, description="Page size (max 100)"),
        offset: int = Query(0, ge=0, description="Number of items to skip"),
    ) -> None:
        self.limit = limit
        self.offset = offset


class Page(BaseModel, Generic[T]):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    items: List[T]
    total: int
    limit: int
    offset: int

    @classmethod
    def build(cls, items: List[T], total: int, params: PaginationParams) -> "Page[T]":
        return cls(items=items, total=total, limit=params.limit, offset=params.offset)
