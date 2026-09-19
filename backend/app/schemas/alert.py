from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.alert import AlertSeverity, AlertStatus


class AlertResponse(BaseModel):
    id: int
    device_id: int
    device_name: Optional[str] = None
    device_ip: Optional[str] = None
    severity: AlertSeverity
    title: str
    message: str
    status: AlertStatus
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlertAcknowledgeRequest(BaseModel):
    note: Optional[str] = Field(default=None, description="Operator note for acknowledging alert")


class AlertThresholdsConfig(BaseModel):
    consecutive_failures_down: int = Field(default=3, ge=1, le=10)
    high_latency_threshold_ms: float = Field(default=100.0, ge=10.0, le=5000.0)
    high_packet_loss_pct: float = Field(default=5.0, ge=1.0, le=100.0)
    high_cpu_threshold_pct: float = Field(default=85.0, ge=50.0, le=99.0)
    high_memory_threshold_pct: float = Field(default=85.0, ge=50.0, le=99.0)
