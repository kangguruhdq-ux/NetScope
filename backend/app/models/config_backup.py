from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ConfigBackup(Base):
    __tablename__ = "config_backups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    backup_name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    device_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True
    )
    device_name: Mapped[str] = mapped_column(String(128), nullable=False, default="Generic Device")
    config_content: Mapped[str] = mapped_column(Text, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, default="admin")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )

    device: Mapped[Optional[Any]] = relationship("Device", foreign_keys=[device_id], lazy="selectin")
