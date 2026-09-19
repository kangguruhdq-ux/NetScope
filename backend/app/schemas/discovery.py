from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class SubnetScanRequest(BaseModel):
    subnet: str = Field(..., description="CIDR format, e.g. 192.168.1.0/24 or 10.0.0.0/24")
    scan_ports: List[int] = Field(default=[22, 53, 80, 443, 161, 8291])
    timeout_seconds: float = Field(default=1.5, ge=0.5, le=5.0)


class DiscoveredDeviceResponse(BaseModel):
    ip_address: str
    hostname: Optional[str] = None
    is_alive: bool
    latency_ms: Optional[float] = None
    open_ports: List[int] = []
    suggested_type: str = "OTHER"
    already_monitored: bool = False


class BulkAddDevicesRequest(BaseModel):
    devices: List[DiscoveredDeviceResponse]
