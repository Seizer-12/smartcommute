"""Add account tokens and email verification state.

Revision ID: a7c9d2e4f506
Revises: f6b8e1a2c304
Create Date: 2026-07-21 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "a7c9d2e4f506"
down_revision = "f6b8e1a2c304"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # A previous interrupted deployment can leave the PostgreSQL enum behind
    # before Alembic records this revision. PostgreSQL does not support
    # CREATE TYPE IF NOT EXISTS for enums, so handle that narrow case here.
    op.execute(
        """
        DO $$
        BEGIN
            CREATE TYPE accounttokenpurpose AS ENUM ('email_verification', 'password_reset');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    # The type is created above (or already exists), so table creation must
    # reference it rather than attempt another CREATE TYPE.
    purpose = postgresql.ENUM(
        "email_verification",
        "password_reset",
        name="accounttokenpurpose",
        create_type=False,
    )
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column("users", "email_verified", server_default=None)
    op.create_table(
        "account_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("purpose", purpose, nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_account_tokens_user_id", "account_tokens", ["user_id"])
    op.create_index("ix_account_tokens_purpose", "account_tokens", ["purpose"])
    op.create_index("ix_account_tokens_token_hash", "account_tokens", ["token_hash"], unique=True)
    op.create_index("ix_account_tokens_expires_at", "account_tokens", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_account_tokens_expires_at", table_name="account_tokens")
    op.drop_index("ix_account_tokens_token_hash", table_name="account_tokens")
    op.drop_index("ix_account_tokens_purpose", table_name="account_tokens")
    op.drop_index("ix_account_tokens_user_id", table_name="account_tokens")
    op.drop_table("account_tokens")
    op.drop_column("users", "email_verified")
    sa.Enum(name="accounttokenpurpose").drop(op.get_bind(), checkfirst=True)
