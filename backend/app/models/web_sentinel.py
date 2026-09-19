from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy import Integer, String, Text, DateTime, Boolean, Float, JSON, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class WebStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    DEGRADED = "DEGRADED"
    DOWN = "DOWN"


class WebTarget(Base):
    __tablename__ = "web_targets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    url: Mapped[str] = mapped_column(String(512), nullable=False, unique=True, index=True)
    check_interval_seconds: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    expected_status_code: Mapped[int] = mapped_column(Integer, default=200, nullable=False)
    timeout_seconds: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)
    resolved_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    check_results: Mapped[list["WebCheckResult"]] = relationship(
        "WebCheckResult", back_populates="target", cascade="all, delete-orphan"
    )


class WebCheckResult(Base):
    __tablename__ = "web_check_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("web_targets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )
    status: Mapped[WebStatus] = mapped_column(
        Enum(WebStatus), default=WebStatus.ONLINE, nullable=False
    )
    http_status: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    response_time_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dns_lookup_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    content_length: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    server_header: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    # Cyber Security & SSL metrics
    ssl_valid: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    ssl_issuer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ssl_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ssl_days_remaining: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    security_score: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)  # A+, A, B, C, F
    security_headers: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    threat_indicators: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Real Network Socket & Protocol Telemetry
    resolved_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    tls_version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    cipher_suite: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    http_version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    payload_size_kb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    redirect_chain: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    raw_headers: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    target: Mapped["WebTarget"] = relationship("WebTarget", back_populates="check_results")

