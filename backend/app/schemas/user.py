from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional
from datetime import datetime
from app.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    bus_type: Optional[str] = None
    role: UserRole

class UserCreate(UserBase):
    # Generous limit restored, no more bcrypt crashing
    password: str = Field(min_length=8, max_length=255, description="Cryptographic password for the user")

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=255)


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    bus_type: Optional[str] = Field(default=None, max_length=50)


class UserResponse(UserBase):
    id: int
    is_active: bool
    wallet_balance: float
    withdrawal_balance: float
    qr_code_uid: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Required in Pydantic V2 to map SQLAlchemy models directly to JSON
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenPayload(BaseModel):
    sub: str | None = None
    role: str | None = None