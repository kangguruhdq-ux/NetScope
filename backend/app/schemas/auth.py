from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    # Allows login with either username or email
    username_or_email: str
    password: str


class RegisterRequest(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None
