"""add candidate profile preferences

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-19

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("candidate_profiles", sa.Column("salary_min", sa.Integer(), nullable=True))
    op.add_column("candidate_profiles", sa.Column("salary_max", sa.Integer(), nullable=True))
    op.add_column(
        "candidate_profiles",
        sa.Column("experience_years", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "candidate_profiles",
        sa.Column("preferred_roles", sa.Text(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("candidate_profiles", "preferred_roles")
    op.drop_column("candidate_profiles", "experience_years")
    op.drop_column("candidate_profiles", "salary_max")
    op.drop_column("candidate_profiles", "salary_min")
