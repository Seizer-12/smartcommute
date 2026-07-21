import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, Enum, DateTime
from app.core.database import Base

class UserRole(str, enum.Enum):
    COMMUTER = "commuter"
    DRIVER = "driver"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(
        Enum(UserRole, values_callable=lambda enum_cls: [member.value for member in enum_cls]),
        default=UserRole.COMMUTER.value,
        nullable=False,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    bus_type = Column(String, nullable=True)

    # Commuter specific fields
    wallet_balance = Column(Float, default=0.0, nullable=False)

    # Driver specific fields
    qr_code_uid = Column(String, unique=True, index=True, nullable=True)
    withdrawal_balance = Column(Float, default=0.0, nullable=False)
    is_available = Column(Boolean, default=False, nullable=False)

    # Audit timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
