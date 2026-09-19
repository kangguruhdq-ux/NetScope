from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class FlappingDevice(BaseModel):
    device_id: int
    device_name: str
    ip_address: str
    flap_count: int
    last_event_time: datetime
    current_status: str


class OutageSummary(BaseModel):
    total_outages: int
    mean_time_to_repair_minutes: float
    longest_outage_minutes: float


class SLAReportResponse(BaseModel):
    period: str  # "24h", "7d", "30d"
    generated_at: datetime
    overall_sla_pct: float
    total_monitored_devices: int
    healthy_devices_count: int
    unhealthy_devices_count: int
    outage_summary: OutageSummary
    top_flapping_devices: List[FlappingDevice]
    average_fleet_latency_ms: float
    average_packet_loss_pct: float
