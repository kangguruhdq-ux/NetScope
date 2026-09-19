from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class MetricUpdateData(BaseModel):
    device_id: int
    name: Optional[str] = None
    status: str
    latency_ms: Optional[float] = None
    packet_loss_pct: float = 0.0
    cpu_usage_pct: Optional[float] = None
    memory_usage_pct: Optional[float] = None
    rx_bps: float = 0.0
    tx_bps: float = 0.0
    uptime_seconds: Optional[int] = None
    last_seen: Optional[datetime] = None


class WebSocketBroadcastMessage(BaseModel):
    type: str  # "METRIC_UPDATE", "STATUS_CHANGE", "ALERT_TRIGGERED", "SYSTEM_EVENT"
    timestamp: datetime
    data: dict


class LiveDashboardMetrics(BaseModel):
    total_devices: int
    devices_up: int
    devices_degraded: int
    devices_down: int
    devices_maintenance: int
    sla_uptime_pct: float
    fleet_avg_latency_ms: float
    global_packet_loss_pct: float
    total_rx_bps: float
    total_tx_bps: float
    active_critical_alerts_count: int
    demo_mode: bool


class SampleResponse(BaseModel):
    id: int
    device_id: int
    timestamp: datetime
    status: str
    latency_ms: Optional[float] = None
    packet_loss_pct: float = 0.0
    cpu_usage_pct: Optional[float] = None
    memory_usage_pct: Optional[float] = None
    rx_bps_total: float = 0.0
    tx_bps_total: float = 0.0

    class Config:
        from_attributes = True


class OutageRecord(BaseModel):
    id: int
    device_id: int
    event_type: str
    old_status: str
    new_status: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True


class HostSystemStats(BaseModel):
    cpu_percent: float
    cpu_cores_count: int
    ram_total_mb: float
    ram_used_mb: float
    ram_free_mb: float
    ram_percent: float
    disk_total_gb: float
    disk_used_gb: float
    disk_free_gb: float
    disk_percent: float
    os_name: str
    host_uptime_seconds: float
    net_bytes_sent_rate_kbps: float = 0.0
    net_bytes_recv_rate_kbps: float = 0.0

