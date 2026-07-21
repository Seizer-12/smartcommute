from datetime import datetime, timedelta, timezone
from hashlib import sha256
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, select, update

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.email import send_account_email
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.account_token import AccountToken, AccountTokenPurpose
from app.models.user import User
from app.schemas.user import (
    EmailVerificationConfirm,
    PasswordChange,
    PasswordResetConfirm,
    PasswordResetRequest,
    Token,
    UserCreate,
    UserLogin,
)

router = APIRouter()


def _token_hash(token: str) -> str:
    return sha256(token.encode()).hexdigest()


async def _send_token_email(
    db: AsyncSession,
    user: User,
    purpose: AccountTokenPurpose,
) -> bool:
    await db.execute(
        update(AccountToken)
        .where(AccountToken.user_id == user.id, AccountToken.purpose == purpose, AccountToken.used_at.is_(None))
        .values(used_at=datetime.now(timezone.utc))
    )
    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24 if purpose == AccountTokenPurpose.email_verification else 1)
    db.add(AccountToken(user_id=user.id, purpose=purpose, token_hash=_token_hash(raw_token), expires_at=expires_at))
    await db.commit()

    if purpose == AccountTokenPurpose.email_verification:
        subject = "Verify your SmartCommute email"
        action_url = f"{settings.FRONTEND_URL.rstrip('/')}/auth?verify_token={raw_token}"
        heading = "Verify your email address"
        intro = "Please confirm your email address to finish securing your SmartCommute account."
        action_label = "Verify email"
        expiry = "24 hours"
    else:
        subject = "Reset your SmartCommute password"
        action_url = f"{settings.FRONTEND_URL.rstrip('/')}/auth?reset_token={raw_token}"
        heading = "Reset your password"
        intro = "We received a request to reset your SmartCommute password."
        action_label = "Reset password"
        expiry = "one hour"
    return await send_account_email(
        user.email,
        subject,
        user.full_name,
        heading,
        intro,
        action_url,
        action_label,
        expiry,
    )


async def _consume_token(
    db: AsyncSession,
    raw_token: str,
    purpose: AccountTokenPurpose,
) -> AccountToken:
    result = await db.execute(
        select(AccountToken).where(
            AccountToken.token_hash == _token_hash(raw_token),
            AccountToken.purpose == purpose,
            AccountToken.used_at.is_(None),
            AccountToken.expires_at > datetime.now(timezone.utc),
        )
    )
    token = result.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=400, detail="This link is invalid or has expired.")
    token.used_at = datetime.now(timezone.utc)
    return token


async def _invalidate_tokens(
    db: AsyncSession,
    user_id: int,
    purpose: AccountTokenPurpose,
) -> None:
    """Invalidate every remaining active token of one purpose for a user."""
    await db.execute(
        update(AccountToken)
        .where(
            AccountToken.user_id == user_id,
            AccountToken.purpose == purpose,
            AccountToken.used_at.is_(None),
        )
        .values(used_at=datetime.now(timezone.utc))
    )

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    #username changes from here
    query = select(User).where(
        or_(User.email == user_in.email, User.username == user_in.username)
    )
    result = await db.execute(query)
    existing_user = result.scalars().first()
    
    if existing_user:
        if existing_user.email == user_in.email:
            raise HTTPException(status_code=400, detail="Email already registered.")
        if existing_user.username == user_in.username:
            raise HTTPException(status_code=400, detail="Username is already taken.")

    user_role_str = user_in.role.value if hasattr(user_in.role, 'value') else user_in.role
    if user_role_str == "admin":
        raise HTTPException(status_code=403, detail="Admin accounts must be provisioned by the system owner.")
    new_user = User(
        email=user_in.email,
        username=user_in.username, 
        full_name=user_in.full_name,
        role=user_role_str,
        bus_type=user_in.bus_type if user_role_str == "driver" else None,
        qr_code_uid=f"@{user_in.username}" if user_role_str == "driver" else None,
        hashed_password=get_password_hash(user_in.password),
        wallet_balance=0.0,
        withdrawal_balance=0.0
    )
    #changes stops here

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    email_verification_sent = await _send_token_email(db, new_user, AccountTokenPurpose.email_verification)
    #changes here
    access_token = create_access_token(subject=new_user.id, role=user_role_str)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user,
        "email_verification_sent": email_verification_sent,
    }

@router.post("/login", response_model=Token)
async def login_user(user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    query = select(User).where(User.email == user_in.email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password."
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is inactive.")
    if not user.email_verified:
        sent = await _send_token_email(db, user, AccountTokenPurpose.email_verification)
        detail = (
            "Verify your email before signing in. A new verification link has been sent."
            if sent
            else "Verify your email before signing in. We could not send a verification link; contact support."
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)
    #changes here
    access_token = create_access_token(subject=user.id, role=user.role)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/password/change")
async def change_password(
    payload: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Your current password is incorrect.")
    if verify_password(payload.new_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Choose a password different from your current password.")
    current_user.hashed_password = get_password_hash(payload.new_password)
    await _invalidate_tokens(db, current_user.id, AccountTokenPurpose.password_reset)
    db.add(current_user)
    await db.commit()
    return {"message": "Password changed successfully."}


@router.post("/password/reset/request")
async def request_password_reset(payload: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user and user.is_active:
        await _send_token_email(db, user, AccountTokenPurpose.password_reset)
    return {"message": "If an active account uses that email, a password-reset link has been sent."}


@router.post("/password/reset/confirm")
async def confirm_password_reset(payload: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    token = await _consume_token(db, payload.token, AccountTokenPurpose.password_reset)
    result = await db.execute(select(User).where(User.id == token.user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="This account is unavailable.")
    user.hashed_password = get_password_hash(payload.new_password)
    # A reset link must be one-time use, and using any one link invalidates all
    # other reset emails that might still be in an inbox.
    await _invalidate_tokens(db, user.id, AccountTokenPurpose.password_reset)
    db.add(user)
    await db.commit()
    return {"message": "Password reset successfully. You can now sign in."}


@router.post("/email-verification/request")
async def request_email_verification(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.email_verified:
        return {"message": "Your email is already verified."}
    sent = await _send_token_email(db, current_user, AccountTokenPurpose.email_verification)
    return {"message": "Verification email sent." if sent else "Verification email could not be sent; contact support."}


@router.post("/email-verification/confirm")
async def confirm_email_verification(payload: EmailVerificationConfirm, db: AsyncSession = Depends(get_db)):
    token = await _consume_token(db, payload.token, AccountTokenPurpose.email_verification)
    result = await db.execute(select(User).where(User.id == token.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="This account is unavailable.")
    user.email_verified = True
    await _invalidate_tokens(db, user.id, AccountTokenPurpose.email_verification)
    db.add(user)
    await db.commit()
    return {"message": "Email verified successfully."}
