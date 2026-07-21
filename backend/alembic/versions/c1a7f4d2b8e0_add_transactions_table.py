"""Add transactions table

Revision ID: c1a7f4d2b8e0
Revises: b9fe4d7f89c1
Create Date: 2026-07-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c1a7f4d2b8e0"
down_revision: Union[str, None] = "b9fe4d7f89c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    transaction_type = sa.Enum(
        "wallet_funding",
        "fare_payment",
        "fare_received",
        "withdrawal",
        name="transactiontype",
    )
    transaction_status = sa.Enum("pending", "success", "failed", name="transactionstatus")

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("counterparty_id", sa.Integer(), nullable=True),
        sa.Column("type", transaction_type, nullable=False),
        sa.Column("status", transaction_status, nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("reference", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["counterparty_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_transactions_counterparty_id"), "transactions", ["counterparty_id"], unique=False)
    op.create_index(op.f("ix_transactions_created_at"), "transactions", ["created_at"], unique=False)
    op.create_index(op.f("ix_transactions_id"), "transactions", ["id"], unique=False)
    op.create_index(op.f("ix_transactions_reference"), "transactions", ["reference"], unique=True)
    op.create_index(op.f("ix_transactions_status"), "transactions", ["status"], unique=False)
    op.create_index(op.f("ix_transactions_type"), "transactions", ["type"], unique=False)
    op.create_index(op.f("ix_transactions_user_id"), "transactions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_transactions_user_id"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_type"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_status"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_reference"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_id"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_created_at"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_counterparty_id"), table_name="transactions")
    op.drop_table("transactions")

    sa.Enum(name="transactionstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="transactiontype").drop(op.get_bind(), checkfirst=True)
