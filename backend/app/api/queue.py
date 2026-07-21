from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt

import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.queue import QueueRole, QueueStatus, TransitQueue
from app.models.user import User
from app.schemas.queue import (
    DriverAvailabilityUpdate,
    LocationHeartbeat,
    QueueActionResponse,
    QueueDispatchResponse,
    QueueStatusResponse,
)

router = APIRouter()
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

SEATS_PER_BUS = 14
DISPATCH_TIME_PER_BUS_MINUTES = 5
PARK_PRESENCE_TTL_SECONDS = 60


async def clear_stale_waiting_entries(db: AsyncSession) -> int:
    """Clear commuters whose in-park heartbeat has expired."""
    stale_before = datetime.now(timezone.utc).timestamp() - PARK_PRESENCE_TTL_SECONDS
    stale_at = datetime.fromtimestamp(stale_before, timezone.utc)
    result = await db.execute(
        update(TransitQueue)
        .where(
            TransitQueue.role == QueueRole.commuter,
            TransitQueue.status == QueueStatus.waiting,
            TransitQueue.last_seen_at < stale_at,
        )
        .values(status=QueueStatus.cleared, cleared_at=datetime.now(timezone.utc))
    )
    if result.rowcount:
        await db.commit()
    return result.rowcount or 0


def _presence_key(user: User) -> str:
    return f"park:{user.role}:{user.id}"


def _available_driver_key(user: User) -> str:
    return f"park:available-driver:{user.id}"


def _congestion_level(active_commuters: int) -> str:
    if active_commuters > 120:
        return "High"
    if active_commuters > 50:
        return "Moderate"
    return "Low"


def _distance_to_park_meters(latitude: float, longitude: float) -> float:
    latitude_delta = radians(settings.PARK_LATITUDE - latitude)
    longitude_delta = radians(settings.PARK_LONGITUDE - longitude)
    latitude_1 = radians(latitude)
    latitude_2 = radians(settings.PARK_LATITUDE)
    haversine = (
        sin(latitude_delta / 2) ** 2
        + cos(latitude_1) * cos(latitude_2) * sin(longitude_delta / 2) ** 2
    )
    return 6_371_000 * 2 * asin(sqrt(haversine))


async def _count_keys(pattern: str) -> int:
    return sum(1 async for _ in redis_client.scan_iter(match=pattern))


async def _get_waiting_entry(db: AsyncSession, user_id: int) -> TransitQueue | None:
    result = await db.execute(
        select(TransitQueue).where(
            TransitQueue.user_id == user_id,
            TransitQueue.status == QueueStatus.waiting,
        )
    )
    return result.scalars().first()


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
    await clear_stale_waiting_entries(db)
    waiting_commuters = (await db.execute(
        select(func.count()).select_from(TransitQueue).where(
            TransitQueue.role == QueueRole.commuter,
            TransitQueue.status == QueueStatus.waiting,
        )
    )).scalar() or 0

    active_commuters = await _count_keys("park:commuter:*")
    active_drivers = await _count_keys("park:driver:*")
    available_buses = await _count_keys("park:available-driver:*")

    buses_needed = (waiting_commuters + SEATS_PER_BUS - 1) // SEATS_PER_BUS
    buses_short = max(0, buses_needed - available_buses)
    estimated_wait_time = buses_short * DISPATCH_TIME_PER_BUS_MINUTES
    congestion_level = _congestion_level(active_commuters)

    entry = None
    if current_user:
        entry = await _get_waiting_entry(db, current_user.id)

    return QueueStatusResponse(
        active_commuters=active_commuters,
        active_drivers=active_drivers,
        waiting_commuters=waiting_commuters,
        available_buses=available_buses,
        buses_needed=buses_needed,
        buses_short=buses_short,
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
    current_user: User = Depends(get_current_user),
):
    return await _build_status(db, current_user)


@router.post("/heartbeat")
async def record_heartbeat(
    payload: LocationHeartbeat,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    distance_meters = _distance_to_park_meters(payload.latitude, payload.longitude)
    accuracy_is_acceptable = (
        payload.accuracy_meters is None
        or payload.accuracy_meters <= settings.PARK_MAX_LOCATION_ACCURACY_METERS
    )
    is_in_park = (
        accuracy_is_acceptable
        and distance_meters <= settings.PARK_GEOFENCE_RADIUS_METERS
    )

    if not is_in_park:
        await redis_client.delete(_presence_key(current_user))
        await redis_client.delete(_available_driver_key(current_user))
        entry = await _get_waiting_entry(db, current_user.id)
        if entry:
            entry.status = QueueStatus.cleared
            entry.cleared_at = datetime.now(timezone.utc)
            db.add(entry)
        driver_was_available = current_user.role == "driver" and current_user.is_available
        if driver_was_available:
            current_user.is_available = False
            db.add(current_user)
        if entry or driver_was_available:
            await db.commit()
        return {
            "status": "outside_geofence",
            "in_geofence": False,
            "distance_meters": round(distance_meters),
        }

    await redis_client.setex(_presence_key(current_user), PARK_PRESENCE_TTL_SECONDS, "active")
    if current_user.role == "commuter":
        entry = await _get_waiting_entry(db, current_user.id)
        if entry:
            entry.last_seen_at = datetime.now(timezone.utc)
            db.add(entry)
            await db.commit()
    if current_user.role == "driver" and current_user.is_available:
        await redis_client.setex(
            _available_driver_key(current_user), PARK_PRESENCE_TTL_SECONDS, "available"
        )
    return {
        "status": "recorded",
        "in_geofence": True,
        "distance_meters": round(distance_meters),
    }


@router.post("/availability")
async def set_driver_availability(
    payload: DriverAvailabilityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can set availability.")

    if payload.available and not await redis_client.exists(_presence_key(current_user)):
        raise HTTPException(
            status_code=403,
            detail="Share a current in-park location before becoming available.",
        )

    current_user.is_available = payload.available
    db.add(current_user)
    if payload.available:
        await redis_client.setex(
            _available_driver_key(current_user), PARK_PRESENCE_TTL_SECONDS, "available"
        )
    else:
        await redis_client.delete(_available_driver_key(current_user))
    await db.commit()
    await db.refresh(current_user)
    return {"available": current_user.is_available}


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

    if not await redis_client.exists(_presence_key(current_user)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be within the park geofence before joining the queue.",
        )

    await clear_stale_waiting_entries(db)
    existing_entry = await _get_waiting_entry(db, current_user.id)
    if existing_entry:
        return QueueActionResponse(
            message="You are already in the queue.",
            position=await _queue_position(db, existing_entry),
        )

    queue_entry = TransitQueue(
        user_id=current_user.id,
        role=QueueRole.commuter,
        last_seen_at=datetime.now(timezone.utc),
    )
    db.add(queue_entry)
    try:
        await db.commit()
        await db.refresh(queue_entry)
    except IntegrityError:
        await db.rollback()
        existing_entry = await _get_waiting_entry(db, current_user.id)
        if existing_entry:
            return QueueActionResponse(
                message="You are already in the queue.",
                position=await _queue_position(db, existing_entry),
            )
        raise

    return QueueActionResponse(
        message="You have joined the queue.",
        position=await _queue_position(db, queue_entry),
    )


@router.post("/dispatch", response_model=QueueDispatchResponse)
async def dispatch_next_commuters(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can dispatch commuters.")
    if not current_user.is_available or not await redis_client.exists(_presence_key(current_user)):
        raise HTTPException(
            status_code=403,
            detail="Become available at the terminus before dispatching commuters.",
        )

    await clear_stale_waiting_entries(db)
    result = await db.execute(
        select(TransitQueue)
        .where(
            TransitQueue.role == QueueRole.commuter,
            TransitQueue.status == QueueStatus.waiting,
        )
        .order_by(TransitQueue.joined_at, TransitQueue.id)
        .limit(SEATS_PER_BUS)
        .with_for_update(skip_locked=True)
    )
    entries = result.scalars().all()
    if not entries:
        return QueueDispatchResponse(message="There are no commuters waiting to board.", boarded_commuters=0)

    dispatched_at = datetime.now(timezone.utc)
    for entry in entries:
        entry.status = QueueStatus.cleared
        entry.cleared_at = dispatched_at
        db.add(entry)
    await db.commit()

    return QueueDispatchResponse(
        message=f"Dispatched {len(entries)} commuter(s) from the queue.",
        boarded_commuters=len(entries),
    )


@router.post("/leave", response_model=QueueActionResponse)
async def leave_queue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await redis_client.delete(_presence_key(current_user))
    await redis_client.delete(_available_driver_key(current_user))

    if current_user.role == "driver" and current_user.is_available:
        current_user.is_available = False
        db.add(current_user)

    entry = await _get_waiting_entry(db, current_user.id)
    if not entry:
        await db.commit()
        return QueueActionResponse(message="You are not currently in the queue.")

    entry.status = QueueStatus.cleared
    entry.cleared_at = datetime.now(timezone.utc)
    db.add(entry)
    await db.commit()

    return QueueActionResponse(message="You have left the queue.")
