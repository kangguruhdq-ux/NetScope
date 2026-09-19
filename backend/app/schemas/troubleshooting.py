from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel


class DiagnosticRunRequest(BaseModel):
    device_id: int


class DiagnosticStepResult(BaseModel):
    step_id: str
    title: str
    status: str  # "PASSED", "WARNING", "FAILED", "SKIPPED"
    duration_ms: float
    message: str
    details: dict[str, Any] = {}


class TroubleshootingReportResponse(BaseModel):
    device_id: int
    device_name: str
    ip_address: str
    executed_at: datetime
    overall_verdict: str  # "HEALTHY", "DEGRADED", "OFFLINE"
    steps: List[DiagnosticStepResult]
    root_cause_analysis: str
    recommendations: List[str]
