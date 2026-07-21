from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.user import UserProfileUpdate, UserResponse

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    payload: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_data = payload.model_dump(exclude_unset=True)
    if "full_name" in update_data:
        current_user.full_name = update_data["full_name"]
    if current_user.role == "driver" and "bus_type" in update_data:
        current_user.bus_type = update_data["bus_type"]

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user
