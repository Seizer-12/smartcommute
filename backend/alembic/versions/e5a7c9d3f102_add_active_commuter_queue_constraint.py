"""Prevent duplicate active commuter queue entries.

Revision ID: e5a7c9d3f102
Revises: d4f6b8e2a901
Create Date: 2026-07-21 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "e5a7c9d3f102"
down_revision = "d4f6b8e2a901"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "uq_active_commuter_queue_user",
        "transit_queues",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("role = 'commuter' AND status = 'waiting'"),
    )


def downgrade() -> None:
    op.drop_index("uq_active_commuter_queue_user", table_name="transit_queues")
