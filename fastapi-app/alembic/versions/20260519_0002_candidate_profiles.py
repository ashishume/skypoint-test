"""candidate profiles

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-19

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("resume_url", sa.String(length=500), nullable=True),
        sa.Column("skills", sa.Text(), nullable=False, server_default=""),
        sa.Column("work_experience", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_candidate_profiles_candidate_id", "candidate_profiles", ["candidate_id"])


def downgrade() -> None:
    op.drop_index("ix_candidate_profiles_candidate_id", table_name="candidate_profiles")
    op.drop_table("candidate_profiles")
