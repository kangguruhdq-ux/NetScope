from __future__ import annotations

from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class StorageInfoResponse(BaseModel):
    db_size_mb: float
    samples_count: int
    alerts_count: int
    resolved_alerts_count: int
    events_count: int
    audit_logs_count: int
    devices_count: int
    web_targets_count: int


class PurgeSamplesRequest(BaseModel):
    days_older_than: int = 7
    purge_all: bool = False


class PurgeAlertsRequest(BaseModel):
    only_resolved: bool = True
    days_older_than: Optional[int] = None


class PurgeEventsRequest(BaseModel):
    days_older_than: int = 14


class BulkDeleteIntRequest(BaseModel):
    ids: List[int]


class BulkDeleteStrRequest(BaseModel):
    ids: List[str]


class SystemActionResponse(BaseModel):
    success: bool
    message: str
    deleted_count: int = 0
    freed_bytes: Optional[int] = None


from datetime import datetime

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[str] = None
    username: Optional[str] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    description: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime


class AuditLogListResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int
