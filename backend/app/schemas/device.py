from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.device import DeviceType, DeviceStatus


class DeviceInterfaceResponse(BaseModel):
    id: int
    device_id: int
    if_index: int
    name: str
    mac_address: Optional[str] = None
    oper_status: str
    speed_bps: int
    prev_in_octets: int
    curr_in_octets: int
    prev_out_octets: int
    curr_out_octets: int
    rx_bps: float
    tx_bps: float
    errors_in: int
    errors_out: int
    updated_at: datetime

    class Config:
        from_attributes = True


class DeviceBase(BaseModel):
    name: str
    hostname: Optional[str] = None
    ip_address: str
    device_type: DeviceType = DeviceType.OTHER
    location: Optional[str] = None
    description: Optional[str] = None
    is_monitored: bool = True
    monitoring_interval_seconds: int = Field(default=30, ge=5, le=3600)
    protocols: List[str] = Field(default=["ICMP"])

    # SNMP
    snmp_version: str = "v2c"
    snmp_port: int = 161
    snmp_community: str = "public"
    snmp_username: Optional[str] = None
    snmp_auth_protocol: Optional[str] = None
    snmp_auth_password: Optional[str] = None
    snmp_priv_protocol: Optional[str] = None
    snmp_priv_password: Optional[str] = None

    # TCP / HTTP Checks
    tcp_check_ports: List[int] = Field(default_factory=list)
    http_health_url: Optional[str] = None


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    device_type: Optional[DeviceType] = None
    location: Optional[str] = None
    description: Optional[str] = None
    is_monitored: Optional[bool] = None
    monitoring_interval_seconds: Optional[int] = None
    protocols: Optional[List[str]] = None
    snmp_version: Optional[str] = None
    snmp_port: Optional[int] = None
    snmp_community: Optional[str] = None
    snmp_username: Optional[str] = None
    snmp_auth_protocol: Optional[str] = None
    snmp_auth_password: Optional[str] = None
    snmp_priv_protocol: Optional[str] = None
    snmp_priv_password: Optional[str] = None
    tcp_check_ports: Optional[List[int]] = None
    http_health_url: Optional[str] = None
    status: Optional[DeviceStatus] = None


class DeviceResponse(DeviceBase):
    id: int
    status: DeviceStatus
    uptime_seconds: int
    consecutive_failures: int
    last_seen: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    interfaces: List[DeviceInterfaceResponse] = []

    # Calculated helper fields
    current_latency_ms: Optional[float] = None
    current_packet_loss_pct: Optional[float] = None

    class Config:
        from_attributes = True


class ConnectivityTestRequest(BaseModel):
    ip_address: str
    protocols: List[str] = ["ICMP"]
    snmp_community: Optional[str] = "public"
    snmp_port: Optional[int] = 161
    tcp_check_ports: Optional[List[int]] = []
    http_health_url: Optional[str] = None


class ConnectivityTestResponse(BaseModel):
    ip_address: str
    icmp_reachable: bool
    icmp_latency_ms: Optional[float] = None
    icmp_packet_loss: float = 0.0
    icmp_message: str
    snmp_responsive: bool = False
    snmp_sys_descr: Optional[str] = None
    snmp_message: Optional[str] = None
    tcp_results: dict[int, bool] = {}
    http_reachable: Optional[bool] = None
    http_status_code: Optional[int] = None
    overall_status: str
