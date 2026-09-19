from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, engine
from app.core.config import settings
from app.models.metrics import MonitoringSample
from app.models.alert import Alert, AlertStatus
from app.models.topology import NetworkEvent
from app.models.audit import AuditLog
from app.models.device import Device
from app.models.web_sentinel import WebTarget
from app.schemas.system import (
    StorageInfoResponse,
    PurgeSamplesRequest,
    PurgeAlertsRequest,
    PurgeEventsRequest,
    SystemActionResponse,
    AuditLogResponse,
    AuditLogListResponse,
)
from app.api.deps import get_current_admin

router = APIRouter(prefix="/system", tags=["System Maintenance"])


@router.get("/storage-info", response_model=StorageInfoResponse)
async def get_storage_info(
    session: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
) -> Any:
    # 1. Determine DB File size
    db_size_mb = 0.0
    db_path = "netscope.db"
    if os.path.exists(db_path):
        db_size_mb = round(os.path.getsize(db_path) / (1024 * 1024), 2)
    elif os.path.exists(f"app/{db_path}"):
        db_size_mb = round(os.path.getsize(f"app/{db_path}") / (1024 * 1024), 2)

    # 2. Table row counts
    samples_count = (await session.execute(select(func.count(MonitoringSample.id)))).scalar() or 0
    alerts_count = (await session.execute(select(func.count(Alert.id)))).scalar() or 0
    resolved_alerts_count = (
        await session.execute(select(func.count(Alert.id)).where(Alert.status == AlertStatus.RESOLVED))
    ).scalar() or 0
    events_count = (await session.execute(select(func.count(NetworkEvent.id)))).scalar() or 0
    audit_logs_count = (await session.execute(select(func.count(AuditLog.id)))).scalar() or 0
    devices_count = (await session.execute(select(func.count(Device.id)))).scalar() or 0
    web_targets_count = (await session.execute(select(func.count(WebTarget.id)))).scalar() or 0

    return StorageInfoResponse(
        db_size_mb=db_size_mb,
        samples_count=samples_count,
        alerts_count=alerts_count,
        resolved_alerts_count=resolved_alerts_count,
        events_count=events_count,
        audit_logs_count=audit_logs_count,
        devices_count=devices_count,
        web_targets_count=web_targets_count,
    )


@router.post("/purge-samples", response_model=SystemActionResponse)
async def purge_samples(
    req: PurgeSamplesRequest,
    session: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
) -> Any:
    if req.purge_all:
        stmt = delete(MonitoringSample)
    else:
        cutoff = datetime.now(timezone.utc) - timedelta(days=req.days_older_than)
        stmt = delete(MonitoringSample).where(MonitoringSample.timestamp < cutoff)

    res = await session.execute(stmt)
    await session.commit()
    deleted_count = res.rowcount

    return SystemActionResponse(
        success=True,
        message=f"Purged {deleted_count} monitoring sample telemetry records.",
        deleted_count=deleted_count,
    )


@router.post("/purge-alerts", response_model=SystemActionResponse)
async def purge_alerts(
    req: PurgeAlertsRequest,
    session: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
) -> Any:
    stmt = delete(Alert)
    conditions = []
    if req.only_resolved:
        conditions.append(Alert.status == AlertStatus.RESOLVED)
    if req.days_older_than is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=req.days_older_than)
        conditions.append(Alert.created_at < cutoff)

    if conditions:
        for cond in conditions:
            stmt = stmt.where(cond)

    res = await session.execute(stmt)
    await session.commit()
    deleted_count = res.rowcount

    return SystemActionResponse(
        success=True,
        message=f"Purged {deleted_count} alert records.",
        deleted_count=deleted_count,
    )


@router.post("/purge-events", response_model=SystemActionResponse)
async def purge_events(
    req: PurgeEventsRequest,
    session: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
) -> Any:
    cutoff = datetime.now(timezone.utc) - timedelta(days=req.days_older_than)
    stmt = delete(NetworkEvent).where(NetworkEvent.created_at < cutoff)

    res = await session.execute(stmt)
    await session.commit()
    deleted_count = res.rowcount

    return SystemActionResponse(
        success=True,
        message=f"Purged {deleted_count} network event incident records.",
        deleted_count=deleted_count,
    )


@router.post("/vacuum", response_model=SystemActionResponse)
async def compact_database(
    admin=Depends(get_current_admin),
) -> Any:
    # Measure size before vacuum
    db_path = "netscope.db"
    size_before = os.path.getsize(db_path) if os.path.exists(db_path) else 0

    # In SQLite, VACUUM rebuilds the database file, repacking it into a minimal amount of disk space
    async with engine.begin() as conn:
        await conn.execute(text("VACUUM;"))

    size_after = os.path.getsize(db_path) if os.path.exists(db_path) else 0
    freed_bytes = max(0, size_before - size_after)

    return SystemActionResponse(
        success=True,
        message=f"SQLite physical VACUUM complete. Freed {round(freed_bytes / 1024, 2)} KB.",
        freed_bytes=freed_bytes,
    )


@router.get("/audit-logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    search: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    session: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
) -> Any:
    stmt = select(AuditLog)
    count_stmt = select(func.count(AuditLog.id))

    if search:
        search_filter = (
            AuditLog.username.ilike(f"%{search}%")
            | AuditLog.description.ilike(f"%{search}%")
            | AuditLog.action.ilike(f"%{search}%")
            | AuditLog.entity.ilike(f"%{search}%")
            | AuditLog.ip_address.ilike(f"%{search}%")
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)

    if action:
        stmt = stmt.where(AuditLog.action == action.upper())
        count_stmt = count_stmt.where(AuditLog.action == action.upper())

    total = (await session.execute(count_stmt)).scalar() or 0
    stmt = stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    logs = (await session.execute(stmt)).scalars().all()

    return AuditLogListResponse(
        logs=[AuditLogResponse.model_validate(l) for l in logs],
        total=total,
    )


@router.delete("/audit-logs/{log_id}", response_model=SystemActionResponse)
async def delete_audit_log(
    log_id: int,
    session: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
) -> Any:
    stmt = select(AuditLog).where(AuditLog.id == log_id)
    log = (await session.execute(stmt)).scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log entry not found")

    await session.delete(log)
    await session.commit()
    return SystemActionResponse(
        success=True,
        message=f"Audit log entry #{log_id} deleted successfully.",
        deleted_count=1,
    )


@router.delete("/audit-logs", response_model=SystemActionResponse)
async def clear_audit_logs(
    days_older_than: Optional[int] = None,
    session: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
) -> Any:
    stmt = delete(AuditLog)
    if days_older_than is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_older_than)
        stmt = stmt.where(AuditLog.created_at < cutoff)

    res = await session.execute(stmt)
    await session.commit()
    return SystemActionResponse(
        success=True,
        message=f"Successfully purged {res.rowcount} audit log records.",
        deleted_count=res.rowcount,
    )
