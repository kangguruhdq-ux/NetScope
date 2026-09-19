from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.models.device import Device, DeviceStatus
from app.models.metrics import MonitoringSample
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.topology import NetworkEvent
import platform
import psutil
import time
from app.schemas.telemetry import LiveDashboardMetrics, SampleResponse, OutageRecord, HostSystemStats
from app.api.deps import get_current_user

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


@router.get("/dashboard-metrics", response_model=LiveDashboardMetrics)
async def get_dashboard_metrics(
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    # 1. Device status breakdown
    devices = (await session.execute(select(Device))).scalars().all()
    total = len(devices)
    up = sum(1 for d in devices if d.status == DeviceStatus.UP)
    degraded = sum(1 for d in devices if d.status == DeviceStatus.DEGRADED)
    down = sum(1 for d in devices if d.status == DeviceStatus.DOWN)
    maint = sum(1 for d in devices if d.status == DeviceStatus.MAINTENANCE)

    # SLA availability percentage: (UP + DEGRADED) / (total - maint)
    monitored_pool = total - maint
    if monitored_pool > 0:
        sla = round(((up + (degraded * 0.7)) / monitored_pool) * 100.0, 2)
    else:
        sla = 100.0

    # 2. Latest sample metrics across devices
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(hours=1)

    # Average latency in last hour
    lat_stmt = select(func.avg(MonitoringSample.latency_ms)).where(
        MonitoringSample.timestamp >= one_hour_ago,
        MonitoringSample.latency_ms.is_not(None),
    )
    avg_lat = (await session.execute(lat_stmt)).scalar() or 0.0

    # Average packet loss
    loss_stmt = select(func.avg(MonitoringSample.packet_loss_pct)).where(
        MonitoringSample.timestamp >= one_hour_ago
    )
    avg_loss = (await session.execute(loss_stmt)).scalar() or 0.0

    # Aggregated RX and TX from interfaces
    total_rx = 0.0
    total_tx = 0.0
    for d in devices:
        for iface in d.interfaces:
            total_rx += iface.rx_bps
            total_tx += iface.tx_bps

    # Active critical alerts
    alert_stmt = select(func.count(Alert.id)).where(
        Alert.status == AlertStatus.ACTIVE,
        Alert.severity == AlertSeverity.CRITICAL,
    )
    critical_alerts = (await session.execute(alert_stmt)).scalar() or 0

    return LiveDashboardMetrics(
        total_devices=total,
        devices_up=up,
        devices_degraded=degraded,
        devices_down=down,
        devices_maintenance=maint,
        sla_uptime_pct=sla,
        fleet_avg_latency_ms=round(float(avg_lat), 1),
        global_packet_loss_pct=round(float(avg_loss), 2),
        total_rx_bps=round(total_rx, 1),
        total_tx_bps=round(total_tx, 1),
        active_critical_alerts_count=critical_alerts,
        demo_mode=settings.DEMO_MODE,
    )


@router.get("/samples/{device_id}", response_model=List[SampleResponse])
async def get_device_samples(
    device_id: int,
    range_str: str = Query(default="1h", pattern="^(1h|6h|24h|7d)$"),
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    now = datetime.now(timezone.utc)
    delta_map = {
        "1h": timedelta(hours=1),
        "6h": timedelta(hours=6),
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
    }
    start_time = now - delta_map[range_str]

    stmt = (
        select(MonitoringSample)
        .where(
            MonitoringSample.device_id == device_id,
            MonitoringSample.timestamp >= start_time,
        )
        .order_by(MonitoringSample.timestamp.asc())
        .limit(300)
    )
    results = await session.execute(stmt)
    return results.scalars().all()


@router.get("/throughput-history")
async def get_throughput_history(
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    """Returns the last 20 time buckets of aggregate RX/TX bandwidth for the Live AreaChart."""
    now = datetime.now(timezone.utc)
    start_time = now - timedelta(minutes=30)

    stmt = (
        select(
            MonitoringSample.timestamp,
            func.sum(MonitoringSample.rx_bps_total).label("rx"),
            func.sum(MonitoringSample.tx_bps_total).label("tx"),
            func.avg(MonitoringSample.latency_ms).label("latency"),
            func.avg(MonitoringSample.packet_loss_pct).label("loss"),
        )
        .where(MonitoringSample.timestamp >= start_time)
        .group_by(MonitoringSample.timestamp)
        .order_by(MonitoringSample.timestamp.asc())
        .limit(30)
    )
    result = await session.execute(stmt)
    rows = result.all()

    points = []
    for r in rows:
        points.append({
            "timestamp": r.timestamp.isoformat(),
            "time_str": r.timestamp.strftime("%H:%M:%S"),
            "rx_kbps": round((r.rx or 0) / 1000.0, 1),
            "tx_kbps": round((r.tx or 0) / 1000.0, 1),
            "latency_ms": round(r.latency or 0, 1),
            "loss_pct": round(r.loss or 0, 2),
        })

    return points


@router.get("/events", response_model=List[OutageRecord])
async def get_network_events(
    device_id: Optional[int] = None,
    limit: int = 50,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    stmt = select(NetworkEvent).order_by(NetworkEvent.created_at.desc()).limit(limit)
    if device_id:
        stmt = stmt.where(NetworkEvent.device_id == device_id)

    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/host-system-stats", response_model=HostSystemStats)
async def get_host_system_stats(
    current_user=Depends(get_current_user),
) -> Any:
    """Returns physical server resource telemetry (CPU, RAM, Disk, and Host Uptime)."""
    cpu_pct = psutil.cpu_percent(interval=None)
    cpu_cores = psutil.cpu_count(logical=True) or 1

    mem = psutil.virtual_memory()
    ram_total_mb = round(mem.total / (1024 * 1024), 1)
    ram_used_mb = round(mem.used / (1024 * 1024), 1)
    ram_free_mb = round(mem.available / (1024 * 1024), 1)
    ram_pct = mem.percent

    # Disk usage for current drive
    try:
        disk = psutil.disk_usage("D:\\")
    except Exception:
        try:
            disk = psutil.disk_usage("C:\\")
        except Exception:
            disk = psutil.disk_usage("/")

    disk_total_gb = round(disk.total / (1024 * 1024 * 1024), 1)
    disk_used_gb = round(disk.used / (1024 * 1024 * 1024), 1)
    disk_free_gb = round(disk.free / (1024 * 1024 * 1024), 1)
    disk_pct = disk.percent

    # System uptime
    boot_time = psutil.boot_time()
    uptime_sec = round(time.time() - boot_time, 1)

    os_info = f"{platform.system()} {platform.release()}"

    # Overall network counters
    net = psutil.net_io_counters()
    sent_kbps = round(net.bytes_sent / 1024, 1)
    recv_kbps = round(net.bytes_recv / 1024, 1)

    return HostSystemStats(
        cpu_percent=cpu_pct,
        cpu_cores_count=cpu_cores,
        ram_total_mb=ram_total_mb,
        ram_used_mb=ram_used_mb,
        ram_free_mb=ram_free_mb,
        ram_percent=ram_pct,
        disk_total_gb=disk_total_gb,
        disk_used_gb=disk_used_gb,
        disk_free_gb=disk_free_gb,
        disk_percent=disk_pct,
        os_name=os_info,
        host_uptime_seconds=uptime_sec,
        net_bytes_sent_rate_kbps=sent_kbps,
        net_bytes_recv_rate_kbps=recv_kbps,
    )
