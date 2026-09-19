from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.device import Device, DeviceStatus
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.topology import NetworkEvent
from app.models.audit import SystemSetting


class AlertEvaluator:
    # Default fallback thresholds
    DEFAULT_THRESHOLDS = {
        "consecutive_failures_down": 3,
        "high_latency_threshold_ms": 100.0,
        "high_packet_loss_pct": 5.0,
        "high_cpu_threshold_pct": 85.0,
        "high_memory_threshold_pct": 85.0,
    }

    @classmethod
    async def get_thresholds(cls, session: AsyncSession) -> dict:
        result = await session.execute(select(SystemSetting).where(SystemSetting.key == "alert_thresholds"))
        setting = result.scalar_one_or_none()
        if setting and isinstance(setting.value, dict):
            thresholds = cls.DEFAULT_THRESHOLDS.copy()
            thresholds.update(setting.value)
            return thresholds
        return cls.DEFAULT_THRESHOLDS

    @classmethod
    async def evaluate_device(
        cls,
        session: AsyncSession,
        device: Device,
        is_reachable: bool,
        latency_ms: Optional[float],
        packet_loss_pct: float,
        cpu_usage_pct: Optional[float] = None,
        memory_usage_pct: Optional[float] = None,
    ) -> Optional[Alert]:
        if device.status == DeviceStatus.MAINTENANCE:
            # Alerts suppressed during maintenance
            return None

        thresholds = await cls.get_thresholds(session)
        max_failures = int(thresholds.get("consecutive_failures_down", 3))
        max_latency = float(thresholds.get("high_latency_threshold_ms", 100.0))
        max_loss = float(thresholds.get("high_packet_loss_pct", 5.0))
        max_cpu = float(thresholds.get("high_cpu_threshold_pct", 85.0))
        max_mem = float(thresholds.get("high_memory_threshold_pct", 85.0))

        old_status = device.status
        new_status = old_status
        generated_alert: Optional[Alert] = None
        now = datetime.now(timezone.utc)

        if not is_reachable:
            device.consecutive_failures += 1
            if device.consecutive_failures >= max_failures:
                new_status = DeviceStatus.DOWN
                # Check if there is already an active alert
                active_stmt = select(Alert).where(
                    Alert.device_id == device.id,
                    Alert.status == AlertStatus.ACTIVE,
                    Alert.severity == AlertSeverity.CRITICAL,
                )
                existing_alert = (await session.execute(active_stmt)).scalar_one_or_none()
                if not existing_alert:
                    generated_alert = Alert(
                        device_id=device.id,
                        severity=AlertSeverity.CRITICAL,
                        title=f"Device {device.name} is DOWN",
                        message=f"Host {device.ip_address} unreachable after {device.consecutive_failures} consecutive poll attempts.",
                        status=AlertStatus.ACTIVE,
                        created_at=now,
                    )
                    session.add(generated_alert)
        else:
            # Host is reachable
            device.consecutive_failures = 0
            device.last_seen = now

            # Check for DEGRADED conditions
            is_degraded = False
            warning_reasons = []

            if latency_ms and latency_ms > max_latency:
                is_degraded = True
                warning_reasons.append(f"High latency: {latency_ms}ms (threshold {max_latency}ms)")
            if packet_loss_pct > max_loss:
                is_degraded = True
                warning_reasons.append(f"High packet loss: {packet_loss_pct}% (threshold {max_loss}%)")
            if cpu_usage_pct and cpu_usage_pct > max_cpu:
                is_degraded = True
                warning_reasons.append(f"High CPU load: {cpu_usage_pct}% (threshold {max_cpu}%)")
            if memory_usage_pct and memory_usage_pct > max_mem:
                is_degraded = True
                warning_reasons.append(f"High memory load: {memory_usage_pct}% (threshold {max_mem}%)")

            if is_degraded:
                new_status = DeviceStatus.DEGRADED
                # Create warning alert if none active
                active_stmt = select(Alert).where(
                    Alert.device_id == device.id,
                    Alert.status == AlertStatus.ACTIVE,
                    Alert.severity == AlertSeverity.WARNING,
                )
                existing_alert = (await session.execute(active_stmt)).scalar_one_or_none()
                if not existing_alert:
                    generated_alert = Alert(
                        device_id=device.id,
                        severity=AlertSeverity.WARNING,
                        title=f"Device {device.name} Performance Degraded",
                        message="; ".join(warning_reasons),
                        status=AlertStatus.ACTIVE,
                        created_at=now,
                    )
                    session.add(generated_alert)
            else:
                new_status = DeviceStatus.UP
                # Auto-resolve any previous active critical/warning alerts
                active_alerts_stmt = select(Alert).where(
                    Alert.device_id == device.id,
                    Alert.status.in_([AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED]),
                )
                active_alerts = (await session.execute(active_alerts_stmt)).scalars().all()
                for al in active_alerts:
                    al.status = AlertStatus.RESOLVED
                    al.resolved_at = now

                # If device was previously DOWN or DEGRADED, create RECOVERY alert
                if old_status in [DeviceStatus.DOWN, DeviceStatus.DEGRADED]:
                    generated_alert = Alert(
                        device_id=device.id,
                        severity=AlertSeverity.RECOVERY,
                        title=f"Device {device.name} Recovered",
                        message=f"Host {device.ip_address} has recovered and is now operating normally.",
                        status=AlertStatus.RESOLVED,
                        created_at=now,
                        resolved_at=now,
                    )
                    session.add(generated_alert)

        if new_status != old_status:
            device.status = new_status
            event = NetworkEvent(
                device_id=device.id,
                event_type="STATUS_CHANGE",
                old_status=old_status.value,
                new_status=new_status.value,
                description=f"Device status changed from {old_status.value} to {new_status.value}",
                created_at=now,
            )
            session.add(event)

        return generated_alert
