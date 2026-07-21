from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.api.deps import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, Token

router = APIRouter()

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
    #changes here
    access_token = create_access_token(subject=new_user.id, role=user_role_str)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
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
    #changes here
    access_token = create_access_token(subject=user.id, role=user.role)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }