from __future__ import annotations

import time
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.device import Device, DeviceType, DeviceStatus, DeviceInterface
from app.models.metrics import MonitoringSample
from app.schemas.device import (
    DeviceCreate,
    DeviceUpdate,
    DeviceResponse,
    ConnectivityTestRequest,
    ConnectivityTestResponse,
)
from app.schemas.system import BulkDeleteIntRequest, SystemActionResponse
from app.api.deps import get_current_user, get_current_operator_or_admin
from app.services.icmp_service import ICMPService
from app.services.snmp_service import SNMPService
from app.services.tcp_http_service import TCPHTTPService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("", response_model=List[DeviceResponse])
async def list_devices(
    device_type: Optional[DeviceType] = None,
    status: Optional[DeviceStatus] = None,
    search: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    stmt = select(Device).order_by(Device.id.asc())

    if device_type:
        stmt = stmt.where(Device.device_type == device_type)
    if status:
        stmt = stmt.where(Device.status == status)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Device.name.ilike(pattern),
                Device.ip_address.ilike(pattern),
                Device.location.ilike(pattern),
            )
        )

    result = await session.execute(stmt)
    devices = result.scalars().all()

    # Enrich with latest sample latency
    enriched = []
    for d in devices:
        sample_stmt = (
            select(MonitoringSample)
            .where(MonitoringSample.device_id == d.id)
            .order_by(MonitoringSample.timestamp.desc())
            .limit(1)
        )
        sample = (await session.execute(sample_stmt)).scalar_one_or_none()

        resp = DeviceResponse.model_validate(d)
        if sample:
            resp.current_latency_ms = sample.latency_ms
            resp.current_packet_loss_pct = sample.packet_loss_pct
        enriched.append(resp)

    return enriched


@router.post("", response_model=DeviceResponse)
async def create_device(
    req: DeviceCreate,
    session: AsyncSession = Depends(get_db),
    operator=Depends(get_current_operator_or_admin),
) -> Any:
    # Check duplicate IP
    stmt = select(Device).where(Device.ip_address == req.ip_address)
    if (await session.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Device with IP {req.ip_address} already exists")

    device = Device(
        name=req.name,
        hostname=req.hostname,
        ip_address=req.ip_address,
        device_type=req.device_type,
        location=req.location,
        description=req.description,
        is_monitored=req.is_monitored,
        monitoring_interval_seconds=req.monitoring_interval_seconds,
        protocols=req.protocols,
        snmp_version=req.snmp_version,
        snmp_port=req.snmp_port,
        snmp_community=req.snmp_community,
        snmp_username=req.snmp_username,
        snmp_auth_protocol=req.snmp_auth_protocol,
        snmp_auth_password=req.snmp_auth_password,
        snmp_priv_protocol=req.snmp_priv_protocol,
        snmp_priv_password=req.snmp_priv_password,
        tcp_check_ports=req.tcp_check_ports,
        http_health_url=req.http_health_url,
        status=DeviceStatus.UNKNOWN,
    )
    session.add(device)
    await session.commit()
    await session.refresh(device)

    # Automatically add primary interface
    primary_if = DeviceInterface(
        device_id=device.id,
        if_index=1,
        name="eth0" if device.device_type != DeviceType.ROUTER else "ether1-gateway",
        oper_status="UP",
        speed_bps=1000000000,
    )
    session.add(primary_if)
    await session.commit()
    await session.refresh(device)

    return device


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: int,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    stmt = select(Device).where(Device.id == device_id)
    device = (await session.execute(stmt)).scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    sample_stmt = (
        select(MonitoringSample)
        .where(MonitoringSample.device_id == device.id)
        .order_by(MonitoringSample.timestamp.desc())
        .limit(1)
    )
    sample = (await session.execute(sample_stmt)).scalar_one_or_none()

    resp = DeviceResponse.model_validate(device)
    if sample:
        resp.current_latency_ms = sample.latency_ms
        resp.current_packet_loss_pct = sample.packet_loss_pct
    return resp


@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: int,
    req: DeviceUpdate,
    session: AsyncSession = Depends(get_db),
    operator=Depends(get_current_operator_or_admin),
) -> Any:
    stmt = select(Device).where(Device.id == device_id)
    device = (await session.execute(stmt)).scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(device, key, value)

    session.add(device)
    await session.commit()
    await session.refresh(device)
    return device


@router.delete("/{device_id}")
async def delete_device(
    device_id: int,
    session: AsyncSession = Depends(get_db),
    admin=Depends(get_current_operator_or_admin),
) -> Any:
    stmt = select(Device).where(Device.id == device_id)
    device = (await session.execute(stmt)).scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    await session.delete(device)
    await session.commit()

    try:
        await AuditService.record_log(
            session=session,
            action="DELETE_DEVICE",
            entity="DEVICE",
            entity_id=device_id,
            username=admin.username,
            user_id=admin.id,
            description=f"Device '{device.name}' ({device.ip_address}) was deleted.",
        )
    except Exception:
        pass

    return {"message": f"Device {device.name} deleted successfully"}


@router.post("/bulk-delete", response_model=SystemActionResponse)
async def bulk_delete_devices(
    req: BulkDeleteIntRequest,
    session: AsyncSession = Depends(get_db),
    admin=Depends(get_current_operator_or_admin),
) -> Any:
    if not req.ids:
        return SystemActionResponse(success=True, message="No device IDs provided", deleted_count=0)

    stmt = delete(Device).where(Device.id.in_(req.ids))
    res = await session.execute(stmt)
    await session.commit()
    return SystemActionResponse(
        success=True,
        message=f"Successfully deleted {res.rowcount} devices.",
        deleted_count=res.rowcount,
    )


@router.post("/{device_id}/toggle-maintenance", response_model=DeviceResponse)
async def toggle_maintenance(
    device_id: int,
    session: AsyncSession = Depends(get_db),
    operator=Depends(get_current_operator_or_admin),
) -> Any:
    stmt = select(Device).where(Device.id == device_id)
    device = (await session.execute(stmt)).scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if device.status == DeviceStatus.MAINTENANCE:
        device.status = DeviceStatus.UNKNOWN
    else:
        device.status = DeviceStatus.MAINTENANCE

    session.add(device)
    await session.commit()
    await session.refresh(device)
    return device


@router.post("/test-connectivity", response_model=ConnectivityTestResponse)
async def test_connectivity(
    req: ConnectivityTestRequest,
    current_user=Depends(get_current_user),
) -> Any:
    # 1. ICMP
    ping_res = await ICMPService.ping(req.ip_address, count=2, timeout_seconds=2.0)

    # 2. SNMP
    snmp_ok = False
    sys_descr = None
    snmp_msg = "Not tested"
    if "SNMP" in req.protocols:
        snmp_ok, sys_descr, _, _, snmp_msg = await SNMPService.get_system_info(
            host=req.ip_address,
            community=req.snmp_community or "public",
            port=req.snmp_port or 161,
            timeout_seconds=2.0,
        )

    # 3. TCP
    tcp_results = {}
    if req.tcp_check_ports:
        tcp_results = await TCPHTTPService.check_ports_bulk(req.ip_address, req.tcp_check_ports, timeout_seconds=1.5)

    # 4. HTTP
    http_ok = None
    http_code = None
    if req.http_health_url:
        http_ok, http_code, _, _ = await TCPHTTPService.check_http(req.http_health_url, timeout_seconds=2.0)

    overall = "REACHABLE" if ping_res.is_alive else "UNREACHABLE"

    return ConnectivityTestResponse(
        ip_address=req.ip_address,
        icmp_reachable=ping_res.is_alive,
        icmp_latency_ms=ping_res.latency_ms,
        icmp_packet_loss=ping_res.packet_loss_pct,
        icmp_message=f"{ping_res.engine_used}: {ping_res.raw_output[:120]}",
        snmp_responsive=snmp_ok,
        snmp_sys_descr=sys_descr,
        snmp_message=snmp_msg,
        tcp_results=tcp_results,
        http_reachable=http_ok,
        http_status_code=http_code,
        overall_status=overall,
    )


@router.post("/{device_id}/live-ping")
async def live_ping_device(
    device_id: int,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    stmt = select(Device).where(Device.id == device_id)
    device = (await session.execute(stmt)).scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    res = await ICMPService.ping(device.ip_address, count=3, timeout_seconds=2.5)
    return {
        "device_id": device.id,
        "device_name": device.name,
        "ip_address": device.ip_address,
        "is_alive": res.is_alive,
        "latency_ms": res.latency_ms,
        "packet_loss_pct": res.packet_loss_pct,
        "engine_used": res.engine_used,
        "output": res.raw_output,
    }
