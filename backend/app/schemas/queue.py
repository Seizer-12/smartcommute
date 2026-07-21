from pydantic import BaseModel
from typing import Optional


class QueueStatusResponse(BaseModel):
    active_commuters: int
    waiting_commuters: int
    available_buses: int
    estimated_wait_time_minutes: int
    optimal_flow: bool
    congestion_level: str
    message: str
    is_joined: bool = False
    position: Optional[int] = None


class QueueActionResponse(BaseModel):
    message: str
    position: Optional[int] = None
