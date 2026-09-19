from __future__ import annotations

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class PortAuditRequest(BaseModel):
    target: str = Field(..., description="Target hostname or IP to scan for vulnerable open ports")
    custom_ports: Optional[List[int]] = Field(default=None, description="Optional custom ports to include")
    timeout_seconds: float = Field(default=1.5, ge=0.2, le=5.0)


class VulnerabilityItem(BaseModel):
    port: int
    service_name: str
    is_open: bool
    risk_level: str  # CRITICAL, HIGH, MEDIUM, LOW, SAFE
    cve_reference: Optional[str] = None
    vulnerability_title: str
    description: str
    remediation_steps: str


class PortAuditReport(BaseModel):
    target: str
    target_ip: str
    scan_timestamp: str
    duration_seconds: float
    total_ports_scanned: int
    open_ports_count: int
    critical_risk_count: int
    high_risk_count: int
    medium_risk_count: int
    security_score: int  # 0 to 100
    overall_verdict: str  # SECURE, WARNING, AT_RISK, COMPROMISED
    vulnerabilities: List[VulnerabilityItem]
    hardening_advisories: List[str]


class ConfigBackupCreate(BaseModel):
    backup_name: str = Field(..., min_length=2, max_length=128)
    device_id: Optional[int] = None
    device_name: str = Field(default="Generic Device", max_length=128)
    config_content: str = Field(..., min_length=1)
    description: Optional[str] = None


class ConfigBackupResponse(BaseModel):
    id: int
    backup_name: str
    device_id: Optional[int] = None
    device_name: str
    config_content: str
    file_size_bytes: int
    description: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime


class ConfigDiffRequest(BaseModel):
    backup_id_a: int
    backup_id_b: int


class ConfigDiffResponse(BaseModel):
    backup_a_name: str
    backup_b_name: str
    diff_lines: List[str]
    added_lines_count: int
    removed_lines_count: int
    identical: bool
