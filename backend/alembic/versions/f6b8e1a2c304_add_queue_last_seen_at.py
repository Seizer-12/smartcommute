"""Track queue heartbeats for stale-entry cleanup.

Revision ID: f6b8e1a2c304
Revises: e5a7c9d3f102
Create Date: 2026-07-21 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "f6b8e1a2c304"
down_revision = "e5a7c9d3f102"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("transit_queues", sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE transit_queues SET last_seen_at = joined_at WHERE last_seen_at IS NULL")
    op.create_index(op.f("ix_transit_queues_last_seen_at"), "transit_queues", ["last_seen_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_transit_queues_last_seen_at"), table_name="transit_queues")
    op.drop_column("transit_queues", "last_seen_at")
