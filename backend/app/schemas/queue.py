from pydantic import BaseModel, Field
from typing import Optional


class QueueStatusResponse(BaseModel):
    active_commuters: int
    active_drivers: int
    waiting_commuters: int
    available_buses: int
    buses_needed: int
    buses_short: int
    estimated_wait_time_minutes: int
    optimal_flow: bool
    congestion_level: str
    message: str
    is_joined: bool = False
    position: Optional[int] = None


class QueueActionResponse(BaseModel):
    message: str
    position: Optional[int] = None


class QueueDispatchResponse(BaseModel):
    message: str
    boarded_commuters: int


class LocationHeartbeat(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_meters: float | None = Field(default=None, ge=0, le=10_000)


class DriverAvailabilityUpdate(BaseModel):
    available: bool
