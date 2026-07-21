from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.transaction import TransactionStatus, TransactionType


class TransactionResponse(BaseModel):
    id: int
    user_id: int
    type: TransactionType
    status: TransactionStatus
    amount: float
    reference: Optional[str] = None
    description: str
    counterparty_id: Optional[int] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WithdrawalRequest(BaseModel):
    amount: float = Field(gt=0)
    bank_name: str = Field(min_length=2, max_length=100)
    account_number: str = Field(min_length=10, max_length=10)
    account_name: str = Field(min_length=2, max_length=120)

    @field_validator("bank_name", "account_name", mode="before")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return str(value).strip()

    @field_validator("account_number", mode="before")
    @classmethod
    def validate_account_number(cls, value: str) -> str:
        clean_value = str(value).strip()
        if not clean_value.isdigit():
            raise ValueError("Account number must contain digits only.")
        return clean_value
