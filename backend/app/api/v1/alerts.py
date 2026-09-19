from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.device import Device
from app.models.audit import SystemSetting
from app.schemas.alert import AlertResponse, AlertAcknowledgeRequest, AlertThresholdsConfig
from app.schemas.system import BulkDeleteIntRequest, SystemActionResponse
from app.api.deps import get_current_user, get_current_operator_or_admin, get_current_admin
from app.services.alert_evaluator import AlertEvaluator

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertResponse])
async def list_alerts(
    severity: Optional[AlertSeverity] = None,
    status: Optional[AlertStatus] = None,
    limit: int = 100,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    stmt = (
        select(Alert, Device.name, Device.ip_address)
        .join(Device, Alert.device_id == Device.id)
        .order_by(desc(Alert.created_at))
        .limit(limit)
    )

    if severity:
        stmt = stmt.where(Alert.severity == severity)
    if status:
        stmt = stmt.where(Alert.status == status)

    result = await session.execute(stmt)
    rows = result.all()

    alerts = []
    for alert, dev_name, dev_ip in rows:
        resp = AlertResponse.model_validate(alert)
        resp.device_name = dev_name
        resp.device_ip = dev_ip
        alerts.append(resp)

    return alerts


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: int,
    req: AlertAcknowledgeRequest,
    session: AsyncSession = Depends(get_db),
    operator=Depends(get_current_operator_or_admin),
) -> Any:
    stmt = select(Alert).where(Alert.id == alert_id)
    alert = (await session.execute(stmt)).scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = AlertStatus.ACKNOWLEDGED
    alert.acknowledged_by = operator.username
    alert.acknowledged_at = datetime.now(timezone.utc)
    if req.note:
        alert.message += f"\n[Ack by {operator.username}]: {req.note}"

    session.add(alert)
    await session.commit()
    await session.refresh(alert)
    return alert


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: int,
    session: AsyncSession = Depends(get_db),
    operator=Depends(get_current_operator_or_admin),
) -> Any:
    stmt = select(Alert).where(Alert.id == alert_id)
    alert = (await session.execute(stmt)).scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = AlertStatus.RESOLVED
    alert.resolved_at = datetime.now(timezone.utc)

    session.add(alert)
    await session.commit()
    await session.refresh(alert)
    return alert


@router.post("/{alert_id}/mute", response_model=AlertResponse)
async def mute_alert(
    alert_id: int,
    session: AsyncSession = Depends(get_db),
    operator=Depends(get_current_operator_or_admin),
) -> Any:
    stmt = select(Alert).where(Alert.id == alert_id)
    alert = (await session.execute(stmt)).scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = AlertStatus.MUTED
    session.add(alert)
    await session.commit()
    await session.refresh(alert)
    return alert


@router.get("/thresholds", response_model=AlertThresholdsConfig)
async def get_thresholds(
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    thresholds = await AlertEvaluator.get_thresholds(session)
    return AlertThresholdsConfig(**thresholds)


@router.put("/thresholds", response_model=AlertThresholdsConfig)
async def update_thresholds(
    req: AlertThresholdsConfig,
    session: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
) -> Any:
    stmt = select(SystemSetting).where(SystemSetting.key == "alert_thresholds")
    setting = (await session.execute(stmt)).scalar_one_or_none()

    new_vals = req.model_dump()
    if not setting:
        setting = SystemSetting(key="alert_thresholds", value=new_vals)
        session.add(setting)
    else:
        setting.value = new_vals
        session.add(setting)

    await session.commit()
    return req


@router.delete("/{alert_id}", response_model=SystemActionResponse)
async def delete_alert(
    alert_id: int,
    session: AsyncSession = Depends(get_db),
    operator=Depends(get_current_operator_or_admin),
) -> Any:
    stmt = select(Alert).where(Alert.id == alert_id)
    alert = (await session.execute(stmt)).scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    await session.delete(alert)
    await session.commit()
    return SystemActionResponse(success=True, message=f"Alert #{alert_id} deleted successfully.", deleted_count=1)


@router.post("/bulk-delete", response_model=SystemActionResponse)
async def bulk_delete_alerts(
    req: BulkDeleteIntRequest,
    session: AsyncSession = Depends(get_db),
    operator=Depends(get_current_operator_or_admin),
) -> Any:
    if not req.ids:
        return SystemActionResponse(success=True, message="No alert IDs provided", deleted_count=0)

    stmt = delete(Alert).where(Alert.id.in_(req.ids))
    res = await session.execute(stmt)
    await session.commit()
    return SystemActionResponse(
        success=True,
        message=f"Successfully deleted {res.rowcount} alerts.",
        deleted_count=res.rowcount,
    )


@router.delete("/purge-resolved", response_model=SystemActionResponse)
async def purge_resolved_alerts(
    session: AsyncSession = Depends(get_db),
    operator=Depends(get_current_operator_or_admin),
) -> Any:
    stmt = delete(Alert).where(Alert.status == AlertStatus.RESOLVED)
    res = await session.execute(stmt)
    await session.commit()
    return SystemActionResponse(
        success=True,
        message=f"Purged all {res.rowcount} resolved alerts.",
        deleted_count=res.rowcount,
    )
