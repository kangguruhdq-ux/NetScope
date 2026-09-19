from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class MonitoringSample(Base):
    __tablename__ = "monitoring_samples"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(16), default="UP", nullable=False)
    latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    packet_loss_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cpu_usage_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    memory_usage_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rx_bps_total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tx_bps_total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    device: Mapped["Device"] = relationship("Device", back_populates="samples")
