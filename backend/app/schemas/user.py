from pydantic import BaseModel, EmailStr, ConfigDict, Field, model_validator
from typing import Literal, Optional
from datetime import datetime
from app.models.user import UserRole

VehicleType = Literal["shuttle", "macopolo"]


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    bus_type: VehicleType | None = None
    role: UserRole

class UserCreate(UserBase):
    # Generous limit restored, no more bcrypt crashing
    password: str = Field(min_length=8, max_length=255, description="Cryptographic password for the user")

    @model_validator(mode="after")
    def require_vehicle_type_for_drivers(self):
        if self.role == UserRole.DRIVER and not self.bus_type:
            raise ValueError("Drivers must choose a vehicle type.")
        if self.role != UserRole.DRIVER and self.bus_type is not None:
            raise ValueError("Only driver accounts can have a vehicle type.")
        return self

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=255)


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    bus_type: VehicleType | None = None


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=255)
    new_password: str = Field(min_length=8, max_length=255)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=20, max_length=255)
    new_password: str = Field(min_length=8, max_length=255)


class EmailVerificationConfirm(BaseModel):
    token: str = Field(min_length=20, max_length=255)


class DriverBusTypeUpdate(BaseModel):
    bus_type: VehicleType


class UserResponse(UserBase):
    id: int
    is_active: bool
    email_verified: bool
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
    email_verification_sent: bool | None = None

class TokenPayload(BaseModel):
    sub: str | None = None
    role: str | None = None
