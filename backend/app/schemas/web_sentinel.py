from __future__ import annotations

from datetime import datetime
from typing import Optional, Any, List, Dict
from pydantic import BaseModel, ConfigDict, Field
from app.models.web_sentinel import WebStatus


class WebTargetBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    url: str = Field(..., min_length=4, max_length=512)
    check_interval_seconds: int = Field(default=60, ge=10, le=3600)
    is_active: bool = True
    expected_status_code: int = Field(default=200, ge=100, le=599)
    timeout_seconds: float = Field(default=5.0, ge=1.0, le=30.0)


class WebTargetCreate(WebTargetBase):
    pass


class WebTargetUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    check_interval_seconds: Optional[int] = None
    is_active: Optional[bool] = None
    expected_status_code: Optional[int] = None
    timeout_seconds: Optional[float] = None


class WebCheckResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    target_id: int
    timestamp: datetime
    status: WebStatus
    http_status: Optional[int] = None
    response_time_ms: Optional[float] = None
    dns_lookup_ms: Optional[float] = None
    content_length: Optional[int] = None
    server_header: Optional[str] = None
    ssl_valid: Optional[bool] = None
    ssl_issuer: Optional[str] = None
    ssl_expires_at: Optional[datetime] = None
    ssl_days_remaining: Optional[int] = None
    security_score: Optional[str] = None
    security_headers: Optional[Dict[str, Any]] = None
    threat_indicators: Optional[List[str]] = None
    error_message: Optional[str] = None
    resolved_ip: Optional[str] = None
    tls_version: Optional[str] = None
    cipher_suite: Optional[str] = None
    http_version: Optional[str] = None
    redirect_chain: Optional[List[str]] = None
    raw_headers: Optional[Dict[str, str]] = None
    payload_size_kb: Optional[float] = None


class WebTargetResponse(WebTargetBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[str] = None
    resolved_ip: Optional[str] = None
    created_at: datetime
    latest_result: Optional[WebCheckResultResponse] = None
    history: Optional[List[WebCheckResultResponse]] = None


class WebScanRequest(BaseModel):
    url: str = Field(..., min_length=4, max_length=512)


class WebScanResponse(BaseModel):
    url: str
    is_online: bool
    status: WebStatus
    http_status: Optional[int] = None
    response_time_ms: Optional[float] = None
    dns_lookup_ms: Optional[float] = None
    content_length: Optional[int] = None
    server_header: Optional[str] = None
    ssl_valid: Optional[bool] = None
    ssl_issuer: Optional[str] = None
    ssl_expires_at: Optional[datetime] = None
    ssl_days_remaining: Optional[int] = None
    security_score: str
    security_headers: Dict[str, Any]
    threat_indicators: List[str]
    recommendations: List[str]
    error_message: Optional[str] = None
    resolved_ip: Optional[str] = None
    tls_version: Optional[str] = None
    cipher_suite: Optional[str] = None
    http_version: Optional[str] = None
    redirect_chain: Optional[List[str]] = None
    raw_headers: Optional[Dict[str, str]] = None
    payload_size_kb: Optional[float] = None
