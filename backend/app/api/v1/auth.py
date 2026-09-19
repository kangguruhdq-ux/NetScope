from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, Token, RefreshTokenRequest
from app.schemas.user import UserResponse
from app.api.deps import get_current_user
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(req: LoginRequest, session: AsyncSession = Depends(get_db)) -> Any:
    # Query by username or email
    stmt = select(User).where(
        or_(
            User.username == req.username_or_email,
            User.email == req.username_or_email,
        )
    )
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive",
        )

    token_data = {"sub": user.id, "role": user.role.value, "username": user.username}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "is_active": user.is_active,
    }

    try:
        await AuditService.record_log(
            session=session,
            action="AUTH_LOGIN",
            entity="USER",
            entity_id=user.id,
            username=user.username,
            user_id=user.id,
            description=f"User '{user.username}' successfully authenticated into NOC platform.",
        )
    except Exception:
        pass

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_dict,
    }


@router.post("/register", response_model=Token)
async def register(req: RegisterRequest, session: AsyncSession = Depends(get_db)) -> Any:
    # Check if username or email already exists
    stmt = select(User).where(or_(User.username == req.username, User.email == req.email))
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is already registered",
        )

    new_user = User(
        username=req.username,
        email=req.email,
        full_name=req.full_name,
        password_hash=get_password_hash(req.password),
        role=UserRole.OPERATOR,
        is_active=True,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    token_data = {"sub": new_user.id, "role": new_user.role.value, "username": new_user.username}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    user_dict = {
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": new_user.role.value,
        "is_active": new_user.is_active,
    }

    try:
        await AuditService.record_log(
            session=session,
            action="AUTH_REGISTER",
            entity="USER",
            entity_id=new_user.id,
            username=new_user.username,
            user_id=new_user.id,
            description=f"New user registered: '{new_user.username}' ({new_user.email}) as {new_user.role.value}.",
        )
    except Exception:
        pass

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_dict,
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(req: RefreshTokenRequest, session: AsyncSession = Depends(get_db)) -> Any:
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    stmt = select(User).where(User.id == user_id)
    user = (await session.execute(stmt)).scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists or is inactive",
        )

    token_data = {"sub": user.id, "role": user.role.value, "username": user.username}
    access_token = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)

    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "is_active": user.is_active,
    }

    return {
        "access_token": access_token,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "user": user_dict,
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> Any:
    return current_user
