from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class QueueRole(str, enum.Enum):
    commuter = "commuter"
    driver = "driver"

class QueueStatus(str, enum.Enum):
    waiting = "waiting"
    cleared = "cleared"

class TransitQueue(Base):
    __tablename__ = "transit_queues"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    role = Column(Enum(QueueRole), nullable=False)
    status = Column(Enum(QueueStatus), default=QueueStatus.waiting, index=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    cleared_at = Column(DateTime(timezone=True), nullable=True)