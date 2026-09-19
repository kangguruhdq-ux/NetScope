from __future__ import annotations

from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserRole
from app.schemas.user import (
    UserResponse,
    UserCreate,
    UserUpdate,
    ProfileUpdate,
    ChangePasswordRequest,
    AdminResetPasswordRequest,
)
from app.schemas.system import BulkDeleteStrRequest, SystemActionResponse
from app.api.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/users", tags=["Users"])


# Profile management for ALL roles (Safeguard 4: Never redirect to dashboard)
@router.get("/profile", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)) -> Any:
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_my_profile(
    req: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> Any:
    if req.email and req.email != current_user.email:
        # Check duplicate email
        stmt = select(User).where(User.email == req.email, User.id != current_user.id)
        exists = (await session.execute(stmt)).scalar_one_or_none()
        if exists:
            raise HTTPException(status_code=400, detail="Email is already used by another user")
        current_user.email = req.email

    if req.full_name:
        current_user.full_name = req.full_name

    if req.avatar_url is not None:
        current_user.avatar_url = req.avatar_url

    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return current_user


import time
import os
import shutil
from pathlib import Path
from fastapi import UploadFile, File


@router.post("/profile/avatar", response_model=UserResponse)
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> Any:
    """Uploads a profile picture from user storage and updates avatar_url."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid image format. Allowed formats: PNG, JPG, JPEG, WEBP, GIF, SVG.",
        )

    uploads_dir = Path(__file__).resolve().parent.parent.parent.parent / "static" / "uploads" / "avatars"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    filename = f"avatar_{current_user.id}_{int(time.time())}{ext}"
    dest_path = uploads_dir / filename

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    current_user.avatar_url = f"/uploads/avatars/{filename}"
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    return current_user


@router.post("/change-password")
async def change_my_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> Any:
    if not verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password does not match")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    current_user.password_hash = get_password_hash(req.new_password)
    session.add(current_user)
    await session.commit()
    return {"message": "Password updated successfully"}


# Admin user management
@router.get("", response_model=List[UserResponse])
async def list_users(
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> Any:
    stmt = select(User).order_by(User.created_at.desc())
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=UserResponse)
async def create_user(
    req: UserCreate,
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> Any:
    stmt = select(User).where(User.username == req.username)
    if (await session.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = User(
        username=req.username,
        email=req.email,
        full_name=req.full_name,
        role=req.role,
        is_active=req.is_active,
        password_hash=get_password_hash(req.password),
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    req: UserUpdate,
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> Any:
    stmt = select(User).where(User.id == user_id)
    user = (await session.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.email:
        user.email = req.email
    if req.full_name:
        user.full_name = req.full_name
    if req.role:
        user.role = req.role
    if req.is_active is not None:
        user.is_active = req.is_active

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> Any:
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrator account")

    stmt = select(User).where(User.id == user_id)
    user = (await session.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await session.delete(user)
    await session.commit()
    return {"message": f"User {user.username} successfully removed"}


@router.post("/bulk-delete", response_model=SystemActionResponse)
async def bulk_delete_users(
    req: BulkDeleteStrRequest,
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> Any:
    if not req.ids:
        return SystemActionResponse(success=True, message="No user IDs provided", deleted_count=0)

    # Filter out admin's own ID
    target_ids = [uid for uid in req.ids if uid != admin.id]
    if not target_ids:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrator account")

    stmt = delete(User).where(User.id.in_(target_ids))
    res = await session.execute(stmt)
    await session.commit()
    return SystemActionResponse(
        success=True,
        message=f"Successfully deleted {res.rowcount} users.",
        deleted_count=res.rowcount,
    )


@router.post("/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    req: AdminResetPasswordRequest,
    session: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> Any:
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    stmt = select(User).where(User.id == user_id)
    user = (await session.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = get_password_hash(req.new_password)
    session.add(user)
    await session.commit()
    return {"message": f"Password for {user.username} successfully reset"}

