import enum
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, String

from app.core.database import Base


class TransactionType(str, enum.Enum):
    wallet_funding = "wallet_funding"
    fare_payment = "fare_payment"
    fare_received = "fare_received"
    withdrawal = "withdrawal"


class TransactionStatus(str, enum.Enum):
    pending = "pending"
    success = "success"
    failed = "failed"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    counterparty_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    type = Column(Enum(TransactionType), nullable=False, index=True)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.success, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    reference = Column(String, nullable=True, unique=True, index=True)
    description = Column(String, nullable=False)
    bank_name = Column(String, nullable=True)
    account_number = Column(String, nullable=True)
    account_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
