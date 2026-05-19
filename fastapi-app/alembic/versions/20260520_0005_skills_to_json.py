"""convert skills and preferred_roles from comma-separated TEXT to JSON arrays

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-20

Why: storing skill lists as comma-separated text violates 1NF, makes accurate
filtering impossible (substring matching falsely matches "react" against
"react-native", "go" against "django"/"mongo"), and forces split/join helpers
in every read/write path. JSON arrays give us a structured representation
that's portable across SQLite and PostgreSQL while keeping the column on
the row (no join table needed for this app's scale).
"""
import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _split_csv(value: str) -> list[str]:
    if not value:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for part in value.split(","):
        item = part.strip().lower()
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


def _migrate_text_to_json(table: str, column: str) -> None:
    bind = op.get_bind()
    rows = bind.execute(sa.text(f"SELECT id, {column} FROM {table}")).fetchall()
    new_col = f"{column}_json"

    op.add_column(
        table,
        sa.Column(new_col, sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )
    for row in rows:
        raw = row[1] or ""
        as_list = _split_csv(raw) if isinstance(raw, str) else list(raw)
        bind.execute(
            sa.text(f"UPDATE {table} SET {new_col} = :v WHERE id = :id"),
            {"v": json.dumps(as_list), "id": row[0]},
        )
    with op.batch_alter_table(table) as batch_op:
        batch_op.drop_column(column)
        batch_op.alter_column(new_col, new_column_name=column)


def _migrate_json_to_text(table: str, column: str) -> None:
    bind = op.get_bind()
    rows = bind.execute(sa.text(f"SELECT id, {column} FROM {table}")).fetchall()
    new_col = f"{column}_text"

    op.add_column(
        table,
        sa.Column(new_col, sa.Text(), nullable=False, server_default=""),
    )
    for row in rows:
        raw = row[1]
        if isinstance(raw, str):
            try:
                items = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                items = []
        else:
            items = raw or []
        bind.execute(
            sa.text(f"UPDATE {table} SET {new_col} = :v WHERE id = :id"),
            {"v": ", ".join(items)},
        )
    with op.batch_alter_table(table) as batch_op:
        batch_op.drop_column(column)
        batch_op.alter_column(new_col, new_column_name=column)


def upgrade() -> None:
    _migrate_text_to_json("job_postings", "skills")
    _migrate_text_to_json("candidate_profiles", "skills")
    _migrate_text_to_json("candidate_profiles", "preferred_roles")


def downgrade() -> None:
    _migrate_json_to_text("candidate_profiles", "preferred_roles")
    _migrate_json_to_text("candidate_profiles", "skills")
    _migrate_json_to_text("job_postings", "skills")
