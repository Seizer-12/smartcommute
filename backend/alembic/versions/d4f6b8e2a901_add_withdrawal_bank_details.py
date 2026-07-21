"""Add withdrawal bank details

Revision ID: d4f6b8e2a901
Revises: c1a7f4d2b8e0
Create Date: 2026-07-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4f6b8e2a901"
down_revision: Union[str, None] = "c1a7f4d2b8e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("bank_name", sa.String(), nullable=True))
    op.add_column("transactions", sa.Column("account_number", sa.String(), nullable=True))
    op.add_column("transactions", sa.Column("account_name", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("transactions", "account_name")
    op.drop_column("transactions", "account_number")
    op.drop_column("transactions", "bank_name")
