import logging
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.user import User
from app.schemas.transaction import (
    PaginatedTransactionsResponse,
    TransactionResponse,
    WithdrawalRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()
MINIMUM_WITHDRAWAL_AMOUNT = 1_000.0


class PaymentPayload(BaseModel):
    driver_username: str


@router.post("/verify/{reference}")
async def verify_payment(
    reference: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "commuter":
        raise HTTPException(status_code=403, detail="Only commuters can fund a commuter wallet.")
    if not settings.PAYSTACK_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Paystack is not configured.")

    existing = await db.execute(select(Transaction).where(Transaction.reference == reference))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This payment reference has already been credited.")

    clean_secret_key = settings.PAYSTACK_SECRET_KEY.strip().strip('"').strip("'")
    headers = {
        "Authorization": f"Bearer {clean_secret_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://api.paystack.co/transaction/verify/{reference}",
                headers=headers,
            )
    except Exception:
        logger.exception("Paystack verification request failed for reference %s", reference)
        raise HTTPException(status_code=503, detail="Connection to Paystack timed out.")

    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Paystack API Error: {response.status_code}")

    data = response.json().get("data", {})
    if data.get("status") != "success":
        gateway_msg = data.get("gateway_response", "Unknown Error")
        raise HTTPException(status_code=400, detail=f"Paystack rejected: {gateway_msg}")
    if data.get("currency") != "NGN":
        raise HTTPException(status_code=400, detail="Only NGN wallet funding is supported.")

    try:
        amount_in_naira = data["amount"] / 100.0
        if amount_in_naira <= 0:
            raise HTTPException(status_code=400, detail="Invalid payment amount.")

        current_user.wallet_balance = (current_user.wallet_balance or 0.0) + amount_in_naira
        db.add(
            Transaction(
                user_id=current_user.id,
                type=TransactionType.wallet_funding,
                amount=amount_in_naira,
                reference=reference,
                description="Wallet funding via Paystack",
            )
        )
        db.add(current_user)
        await db.commit()
        await db.refresh(current_user)
        return {"message": "Wallet funded successfully", "new_balance": current_user.wallet_balance}
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="This payment reference has already been credited.")
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        logger.exception("Database update failed after Paystack verification")
        raise HTTPException(status_code=500, detail="Payment verified, but database update failed.")


@router.post("/pay-driver")
async def pay_driver(
    payload: PaymentPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        if current_user.role != "commuter":
            raise HTTPException(status_code=403, detail="Only commuters can pay drivers.")

        target_username = payload.driver_username.replace("@", "").strip().lower()
        if not target_username:
            raise HTTPException(status_code=400, detail="Driver username is required.")
        if current_user.username.lower() == target_username:
            raise HTTPException(status_code=400, detail="You cannot pay yourself.")

        result = await db.execute(select(User).where(User.username.ilike(target_username)))
        driver = result.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail=f"Driver '@{target_username}' not found.")
        if driver.role != "driver":
            raise HTTPException(status_code=400, detail="This user is not registered as a driver.")

        fare_amount = 150.0 if driver.bus_type == "macopolo" else 250.0
        commuter_balance = current_user.wallet_balance or 0.0
        if commuter_balance < fare_amount:
            raise HTTPException(status_code=400, detail=f"Insufficient balance. You need ₦{fare_amount}.")

        current_user.wallet_balance = commuter_balance - fare_amount
        driver.wallet_balance = (driver.wallet_balance or 0.0) + fare_amount

        reference = f"fare_{uuid4().hex}"
        db.add(
            Transaction(
                user_id=current_user.id,
                counterparty_id=driver.id,
                type=TransactionType.fare_payment,
                amount=fare_amount,
                reference=reference,
                description=f"Fare paid to @{driver.username}",
            )
        )
        db.add(
            Transaction(
                user_id=driver.id,
                counterparty_id=current_user.id,
                type=TransactionType.fare_received,
                amount=fare_amount,
                reference=f"{reference}_driver",
                description=f"Fare received from @{current_user.username}",
            )
        )
        db.add(current_user)
        db.add(driver)
        await db.commit()
        await db.refresh(current_user)

        return {
            "message": f"Successfully paid ₦{fare_amount} to @{driver.username}",
            "new_balance": current_user.wallet_balance,
            "fare_charged": fare_amount,
        }
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        logger.exception("Fare payment failed")
        raise HTTPException(status_code=500, detail="Transaction failed. No funds were deducted.")


@router.get("/transactions", response_model=PaginatedTransactionsResponse)
async def list_transactions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total = await db.scalar(
        select(func.count(Transaction.id)).where(Transaction.user_id == current_user.id)
    ) or 0
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .order_by(desc(Transaction.created_at), desc(Transaction.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return {
        "items": result.scalars().all(),
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/withdraw")
async def withdraw(
    payload: WithdrawalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "driver":
        raise HTTPException(status_code=403, detail="Only drivers can withdraw earnings.")
    if payload.amount < MINIMUM_WITHDRAWAL_AMOUNT:
        raise HTTPException(
            status_code=400,
            detail="The minimum withdrawal amount is ₦1,000.",
        )
    balance = current_user.wallet_balance or 0.0
    if payload.amount > balance:
        raise HTTPException(status_code=400, detail="Insufficient driver balance.")

    current_user.wallet_balance = balance - payload.amount
    current_user.withdrawal_balance = (current_user.withdrawal_balance or 0.0) + payload.amount
    db.add(
        Transaction(
            user_id=current_user.id,
            type=TransactionType.withdrawal,
            status=TransactionStatus.pending,
            amount=payload.amount,
            reference=f"withdraw_{uuid4().hex}",
            description=f"Withdrawal request to {payload.bank_name} account ending {payload.account_number[-4:]}",
            bank_name=payload.bank_name,
            account_number=payload.account_number,
            account_name=payload.account_name,
        )
    )
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return {
        "message": "Withdrawal request recorded for admin payout review.",
        "new_balance": current_user.wallet_balance,
        "withdrawal_balance": current_user.withdrawal_balance,
    }
