from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.user import User
from app.schemas.transaction import TransactionResponse
from app.schemas.user import UserResponse

router = APIRouter()


class WithdrawalStatusUpdate(BaseModel):
    status: TransactionStatus


class BalanceUpdate(BaseModel):
    wallet_balance: float = Field(ge=0)
    withdrawal_balance: float | None = Field(default=None, ge=0)


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


@router.get("/summary")
async def admin_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    total_users = await db.scalar(select(func.count(User.id)))
    commuters = await db.scalar(select(func.count(User.id)).where(User.role == "commuter"))
    drivers = await db.scalar(select(func.count(User.id)).where(User.role == "driver"))
    admins = await db.scalar(select(func.count(User.id)).where(User.role == "admin"))
    pending_withdrawals = await db.scalar(
        select(func.count(Transaction.id)).where(
            Transaction.type == TransactionType.withdrawal,
            Transaction.status == TransactionStatus.pending,
        )
    )
    pending_payout_total = await db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0.0)).where(
            Transaction.type == TransactionType.withdrawal,
            Transaction.status == TransactionStatus.pending,
        )
    )

    return {
        "total_users": total_users or 0,
        "commuters": commuters or 0,
        "drivers": drivers or 0,
        "admins": admins or 0,
        "pending_withdrawals": pending_withdrawals or 0,
        "pending_payout_total": float(pending_payout_total or 0.0),
    }


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(select(User).order_by(desc(User.created_at)).limit(200))
    return result.scalars().all()


@router.patch("/users/{user_id}/balance", response_model=UserResponse)
async def update_user_balance(
    user_id: int,
    payload: BalanceUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Admin balances cannot be edited here.")

    user.wallet_balance = payload.wallet_balance
    if user.role == "driver" and payload.withdrawal_balance is not None:
        user.withdrawal_balance = payload.withdrawal_balance

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/withdrawals", response_model=list[TransactionResponse])
async def list_withdrawals(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Transaction)
        .where(Transaction.type == TransactionType.withdrawal)
        .order_by(desc(Transaction.created_at))
        .limit(100)
    )
    return result.scalars().all()


@router.patch("/withdrawals/{transaction_id}", response_model=TransactionResponse)
async def update_withdrawal_status(
    transaction_id: int,
    payload: WithdrawalStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    if payload.status == TransactionStatus.pending:
        raise HTTPException(status_code=400, detail="Choose success or failed for review completion.")

    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.type == TransactionType.withdrawal,
        )
    )
    withdrawal = result.scalar_one_or_none()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal request not found.")
    if withdrawal.status != TransactionStatus.pending:
        raise HTTPException(status_code=400, detail="Withdrawal request has already been reviewed.")

    user_result = await db.execute(select(User).where(User.id == withdrawal.user_id))
    driver = user_result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Withdrawal owner not found.")

    held_balance = driver.withdrawal_balance or 0.0
    driver.withdrawal_balance = max(held_balance - withdrawal.amount, 0.0)
    if payload.status == TransactionStatus.failed:
        driver.wallet_balance = (driver.wallet_balance or 0.0) + withdrawal.amount

    withdrawal.status = payload.status
    db.add(driver)
    db.add(withdrawal)
    await db.commit()
    await db.refresh(withdrawal)
    return withdrawal
