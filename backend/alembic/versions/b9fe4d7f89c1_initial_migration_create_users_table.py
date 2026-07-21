"""Initial migration: create users and transit queue tables

Revision ID: b9fe4d7f89c1
Revises:
Create Date: 2026-06-02 19:15:01.576070

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b9fe4d7f89c1"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    user_role = sa.Enum("commuter", "driver", "admin", name="userrole")
    queue_role = sa.Enum("commuter", "driver", name="queuerole")
    queue_status = sa.Enum("waiting", "cleared", name="queuestatus")

    user_role.create(op.get_bind(), checkfirst=True)
    queue_role.create(op.get_bind(), checkfirst=True)
    queue_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("bus_type", sa.String(), nullable=True),
        sa.Column("wallet_balance", sa.Float(), nullable=False),
        sa.Column("qr_code_uid", sa.String(), nullable=True),
        sa.Column("withdrawal_balance", sa.Float(), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_qr_code_uid"), "users", ["qr_code_uid"], unique=True)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    op.create_table(
        "transit_queues",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("role", queue_role, nullable=False),
        sa.Column("status", queue_status, nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("cleared_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_transit_queues_id"), "transit_queues", ["id"], unique=False)
    op.create_index(op.f("ix_transit_queues_status"), "transit_queues", ["status"], unique=False)
    op.create_index(op.f("ix_transit_queues_user_id"), "transit_queues", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_transit_queues_user_id"), table_name="transit_queues")
    op.drop_index(op.f("ix_transit_queues_status"), table_name="transit_queues")
    op.drop_index(op.f("ix_transit_queues_id"), table_name="transit_queues")
    op.drop_table("transit_queues")

    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_qr_code_uid"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    sa.Enum(name="queuestatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="queuerole").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="userrole").drop(op.get_bind(), checkfirst=True)
