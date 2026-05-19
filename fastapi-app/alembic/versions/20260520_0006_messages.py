"""Add HR candidate message threads.

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-20 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "message_threads",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("hr_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["hr_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["job_id"], ["job_postings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id", "candidate_id", "hr_id", name="uq_message_thread_participants"),
    )
    op.create_index(op.f("ix_message_threads_candidate_id"), "message_threads", ["candidate_id"], unique=False)
    op.create_index("ix_message_threads_candidate_updated", "message_threads", ["candidate_id", "updated_at"], unique=False)
    op.create_index(op.f("ix_message_threads_hr_id"), "message_threads", ["hr_id"], unique=False)
    op.create_index(op.f("ix_message_threads_job_id"), "message_threads", ["job_id"], unique=False)

    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("thread_id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["thread_id"], ["message_threads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_messages_sender_id"), "messages", ["sender_id"], unique=False)
    op.create_index(op.f("ix_messages_thread_id"), "messages", ["thread_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_messages_thread_id"), table_name="messages")
    op.drop_index(op.f("ix_messages_sender_id"), table_name="messages")
    op.drop_table("messages")
    op.drop_index(op.f("ix_message_threads_job_id"), table_name="message_threads")
    op.drop_index(op.f("ix_message_threads_hr_id"), table_name="message_threads")
    op.drop_index("ix_message_threads_candidate_updated", table_name="message_threads")
    op.drop_index(op.f("ix_message_threads_candidate_id"), table_name="message_threads")
    op.drop_table("message_threads")
