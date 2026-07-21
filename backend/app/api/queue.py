from datetime import datetime, timezone

import redis
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.queue import QueueRole, QueueStatus, TransitQueue
from app.models.user import User
from app.schemas.queue import QueueActionResponse, QueueStatusResponse

router = APIRouter()
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

SEATS_PER_BUS = 14
DISPATCH_TIME_PER_BUS_MINUTES = 5
PARK_PRESENCE_TTL_SECONDS = 60


def _presence_key(user: User) -> str:
    return f"park:{user.role}:{user.id}"


def _congestion_level(active_commuters: int) -> str:
    if active_commuters > 120:
        return "High"
    if active_commuters > 50:
        return "Moderate"
    return "Low"


def _count_presence(pattern: str) -> int:
    return sum(1 for _ in redis_client.scan_iter(pattern))


async def _get_waiting_entry(db: AsyncSession, user_id: int) -> TransitQueue | None:
    result = await db.execute(
        select(TransitQueue).where(
            TransitQueue.user_id == user_id,
            TransitQueue.status == QueueStatus.waiting,
        )
    )
    return result.scalar_one_or_none()


async def _queue_position(db: AsyncSession, entry: TransitQueue | None) -> int | None:
    if not entry:
        return None

    result = await db.execute(
        select(func.count()).select_from(TransitQueue).where(
            TransitQueue.role == QueueRole.commuter,
            TransitQueue.status == QueueStatus.waiting,
            TransitQueue.joined_at <= entry.joined_at,
        )
    )
    return result.scalar() or 1


async def _build_status(
    db: AsyncSession,
    current_user: User | None = None,
) -> QueueStatusResponse:
    waiting_commuters = (await db.execute(
        select(func.count()).select_from(TransitQueue).where(
            TransitQueue.role == QueueRole.commuter,
            TransitQueue.status == QueueStatus.waiting,
        )
    )).scalar() or 0

    waiting_drivers = (await db.execute(
        select(func.count()).select_from(TransitQueue).where(
            TransitQueue.role == QueueRole.driver,
            TransitQueue.status == QueueStatus.waiting,
        )
    )).scalar() or 0

    active_commuters = _count_presence("park:commuter:*")
    active_drivers = _count_presence("park:driver:*")
    available_buses = max(waiting_drivers, active_drivers)

    buses_needed = (waiting_commuters + SEATS_PER_BUS - 1) // SEATS_PER_BUS
    buses_short = max(0, buses_needed - available_buses)
    estimated_wait_time = buses_short * DISPATCH_TIME_PER_BUS_MINUTES
    congestion_level = _congestion_level(active_commuters)

    entry = None
    if current_user:
        entry = await _get_waiting_entry(db, current_user.id)

    return QueueStatusResponse(
        active_commuters=active_commuters,
        waiting_commuters=waiting_commuters,
        available_buses=available_buses,
        estimated_wait_time_minutes=estimated_wait_time,
        optimal_flow=estimated_wait_time <= 15,
        congestion_level=congestion_level,
        message=f"There are currently {active_commuters} commuters at the terminus.",
        is_joined=entry is not None,
        position=await _queue_position(db, entry),
    )


@router.get("/status", response_model=QueueStatusResponse)
async def get_queue_status(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    return await _build_status(db, current_user)


@router.post("/heartbeat")
async def record_heartbeat(current_user: User = Depends(get_current_user)):
    redis_client.setex(_presence_key(current_user), PARK_PRESENCE_TTL_SECONDS, "active")
    return {"status": "recorded"}


@router.post("/join", response_model=QueueActionResponse)
async def join_queue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "commuter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only commuters can join the passenger queue.",
        )

    if not redis_client.exists(_presence_key(current_user)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be within the park geofence before joining the queue.",
        )

    existing_entry = await _get_waiting_entry(db, current_user.id)
    if existing_entry:
        return QueueActionResponse(
            message="You are already in the queue.",
            position=await _queue_position(db, existing_entry),
        )

    queue_entry = TransitQueue(user_id=current_user.id, role=QueueRole.commuter)
    db.add(queue_entry)
    await db.commit()
    await db.refresh(queue_entry)

    return QueueActionResponse(
        message="You have joined the queue.",
        position=await _queue_position(db, queue_entry),
    )


@router.post("/leave", response_model=QueueActionResponse)
async def leave_queue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    redis_client.delete(_presence_key(current_user))

    entry = await _get_waiting_entry(db, current_user.id)
    if not entry:
        return QueueActionResponse(message="You are not currently in the queue.")

    entry.status = QueueStatus.cleared
    entry.cleared_at = datetime.now(timezone.utc)
    db.add(entry)
    await db.commit()

    return QueueActionResponse(message="You have left the queue.")
