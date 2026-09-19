from __future__ import annotations

import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "NetScope"
    TAGLINE: str = "Real-Time Network Operations Center & Diagnostics Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = "netscope_super_secret_jwt_signing_key_2026_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database: SQLite Async with WAL mode by default, PostgreSQL ready
    DATABASE_URL: str = "sqlite+aiosqlite:///./netscope.db"

    # Operating Mode: DEMO_MODE=true runs simulator, DEMO_MODE=false queries physical network
    DEMO_MODE: bool = False

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*",
    ]

    # Default Seed Admin Credentials
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_EMAIL: str = "admin@netscope.local"
    DEFAULT_ADMIN_PASSWORD: str = "AdminPassword123!"
    DEFAULT_ADMIN_FULLNAME: str = "NOC Super Administrator"

    # Monitoring Safeguards
    MONITORING_CONCURRENCY_LIMIT: int = 32
    DEFAULT_DEVICE_TIMEOUT: float = 2.5
    DEFAULT_MONITORING_INTERVAL: int = 15

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
