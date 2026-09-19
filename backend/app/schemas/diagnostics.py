from __future__ import annotations

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TracerouteRequest(BaseModel):
    target: str = Field(..., description="Target hostname or IP address to trace")
    max_hops: int = Field(default=30, ge=1, le=64)
    timeout_seconds: float = Field(default=3.0, ge=0.5, le=10.0)


class TracerouteHop(BaseModel):
    hop: int
    ip_address: Optional[str] = None
    hostname: Optional[str] = None
    rtt_ms: Optional[float] = None
    packet_loss_pct: float = 0.0
    status: str = "REACHABLE"  # REACHABLE, TIMEOUT, ANOMALY


class TracerouteReport(BaseModel):
    target: str
    target_ip: Optional[str] = None
    total_hops: int
    destination_reached: bool
    total_time_ms: float
    hops: List[TracerouteHop]
    verdict: str


class DNSBenchmarkRequest(BaseModel):
    domain: str = Field(default="google.com", description="Domain to query")
    record_types: List[str] = Field(default=["A", "AAAA", "MX", "TXT", "NS"])


class DNSRecordItem(BaseModel):
    record_type: str
    values: List[str]
    ttl: Optional[int] = None


class DNSResolverBenchmark(BaseModel):
    resolver_name: str
    resolver_ip: str
    latency_ms: Optional[float] = None
    status: str = "HEALTHY"  # HEALTHY, SLOW, UNREACHABLE
    resolved_ip: Optional[str] = None


class DNSBenchmarkReport(BaseModel):
    domain: str
    canonical_ip: Optional[str] = None
    query_timestamp: str
    records: List[DNSRecordItem]
    resolver_benchmarks: List[DNSResolverBenchmark]
    anti_spoofing_status: str  # VERIFIED, MISMATCH_DETECTED, WARNING
    notes: List[str]


class SpeedtestRequest(BaseModel):
    test_type: str = Field(default="all", description="download, upload, or all")
    sample_size_mb: int = Field(default=5, ge=1, le=25)


class SpeedtestReport(BaseModel):
    download_mbps: float
    upload_mbps: float
    latency_ms: float
    jitter_ms: float
    bufferbloat_grade: str  # A+, A, B, C, D
    bytes_transferred_mb: float
    duration_seconds: float
    isp_rating: str


class InterfaceStat(BaseModel):
    interface_name: str
    bytes_sent_rate_kbps: float
    bytes_recv_rate_kbps: float
    packets_sent_rate_pps: float
    packets_recv_rate_pps: float
    drop_in_total: int
    drop_out_total: int
    error_in_total: int
    error_out_total: int
    is_up: bool
    storm_detected: bool = False
    storm_severity: Optional[str] = None  # None, WARNING, CRITICAL


class InterfaceStatsReport(BaseModel):
    timestamp: str
    total_interfaces: int
    active_interfaces: int
    interfaces: List[InterfaceStat]
    global_storm_alert: bool
