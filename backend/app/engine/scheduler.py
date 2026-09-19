from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.device import Device, DeviceStatus, DeviceInterface
from app.models.metrics import MonitoringSample
from app.services.icmp_service import ICMPService
from app.services.snmp_service import SNMPService
from app.services.tcp_http_service import TCPHTTPService
from app.services.alert_evaluator import AlertEvaluator
from app.services.simulator_service import SimulatorService
from app.engine.websocket_manager import ws_manager

logger = logging.getLogger("netscope.scheduler")


class MonitoringScheduler:
    def __init__(self):
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self.semaphore = asyncio.Semaphore(settings.MONITORING_CONCURRENCY_LIMIT)

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._monitoring_loop())
            logger.info("Monitoring background engine started.")

    def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            logger.info("Monitoring background engine stopped.")

    async def _poll_single_device(self, device_id: int):
        async with self.semaphore:
            async with AsyncSessionLocal() as session:
                try:
                    stmt = select(Device).where(Device.id == device_id)
                    res = await session.execute(stmt)
                    device = res.scalar_one_or_none()
                    if not device or not device.is_monitored:
                        return

                    now = datetime.now(timezone.utc)
                    delta_seconds = max(1.0, float(settings.DEFAULT_MONITORING_INTERVAL))

                    if settings.DEMO_MODE:
                        # Demo simulator mode
                        sim_data = SimulatorService.generate_device_telemetry(
                            device.id, device.device_type.value, device.ip_address
                        )
                        is_reachable = sim_data["is_alive"]
                        latency_ms = sim_data["latency_ms"]
                        loss_pct = sim_data["packet_loss_pct"]
                        cpu_pct = sim_data["cpu_usage_pct"]
                        mem_pct = sim_data["memory_usage_pct"]
                        rx_bps_total = sim_data["rx_bps"]
                        tx_bps_total = sim_data["tx_bps"]

                        # Advance interface octet counters realistically
                        for iface in device.interfaces:
                            added_in_bytes = int((rx_bps_total / 8.0) * delta_seconds)
                            added_out_bytes = int((tx_bps_total / 8.0) * delta_seconds)

                            iface.prev_in_octets = iface.curr_in_octets
                            iface.curr_in_octets += added_in_bytes
                            iface.prev_out_octets = iface.curr_out_octets
                            iface.curr_out_octets += added_out_bytes

                            # Exact counter delta formula
                            iface.rx_bps = ((iface.curr_in_octets - iface.prev_in_octets) * 8.0) / delta_seconds
                            iface.tx_bps = ((iface.curr_out_octets - iface.prev_out_octets) * 8.0) / delta_seconds
                            iface.updated_at = now
                    else:
                        # Live physical network monitoring
                        # 1. Dual-Engine ICMP Ping
                        try:
                            ping_res = await ICMPService.ping(
                                device.ip_address,
                                count=1,
                                timeout_seconds=1.5,
                            )
                            is_reachable = ping_res.is_alive
                            latency_ms = ping_res.latency_ms
                            loss_pct = ping_res.packet_loss_pct
                        except Exception as ping_err:
                            logger.debug(f"Ping exception for {device.ip_address}: {ping_err}")
                            is_reachable = False
                            latency_ms = None
                            loss_pct = 100.0

                        cpu_pct = None
                        mem_pct = None
                        rx_bps_total = 0.0
                        tx_bps_total = 0.0

                        # 2. SNMP Polling (if enabled)
                        if is_reachable and "SNMP" in (device.protocols or []):
                            try:
                                snmp_ok, sys_descr, uptime_ticks, sys_name, _ = await SNMPService.get_system_info(
                                    host=device.ip_address,
                                    community=device.snmp_community,
                                    port=device.snmp_port,
                                    timeout_seconds=settings.DEFAULT_DEVICE_TIMEOUT,
                                )
                                if snmp_ok and uptime_ticks:
                                    device.uptime_seconds = int(uptime_ticks / 100)
                            except Exception:
                                pass

                        # 3. TCP Port Probes (if defined)
                        if is_reachable and device.tcp_check_ports:
                            try:
                                port_map = await TCPHTTPService.check_ports_bulk(
                                    device.ip_address, device.tcp_check_ports, timeout_seconds=1.5
                                )
                                # If all specified TCP ports are closed/unresponsive, reflect in loss/status
                                if not any(port_map.values()):
                                    loss_pct = max(loss_pct, 20.0)
                            except Exception:
                                pass

                        # 4. HTTP Health Probe (if defined)
                        if is_reachable and device.http_health_url:
                            try:
                                http_ok, _, _, _ = await TCPHTTPService.check_http(
                                    device.http_health_url, timeout_seconds=2.0
                                )
                                if not http_ok:
                                    loss_pct = max(loss_pct, 10.0)
                            except Exception:
                                pass

                        # Interface updates for real devices
                        for iface in device.interfaces:
                            iface.oper_status = "UP" if is_reachable else "DOWN"
                            iface.updated_at = now

                    # Evaluate alert thresholds
                    alert_created = await AlertEvaluator.evaluate_device(
                        session=session,
                        device=device,
                        is_reachable=is_reachable,
                        latency_ms=latency_ms,
                        packet_loss_pct=loss_pct,
                        cpu_usage_pct=cpu_pct,
                        memory_usage_pct=mem_pct,
                    )

                    # Update uptime
                    if device.status == DeviceStatus.UP:
                        device.uptime_seconds += int(delta_seconds)

                    # Save monitoring sample log
                    sample = MonitoringSample(
                        device_id=device.id,
                        timestamp=now,
                        status=device.status.value,
                        latency_ms=latency_ms,
                        packet_loss_pct=loss_pct,
                        cpu_usage_pct=cpu_pct,
                        memory_usage_pct=mem_pct,
                        rx_bps_total=rx_bps_total,
                        tx_bps_total=tx_bps_total,
                    )
                    session.add(sample)
                    await session.commit()

                    # Broadcast telemetry update via WebSocket
                    broadcast_data = {
                        "device_id": device.id,
                        "name": device.name,
                        "status": device.status.value,
                        "latency_ms": latency_ms,
                        "packet_loss_pct": loss_pct,
                        "cpu_usage_pct": cpu_pct,
                        "memory_usage_pct": mem_pct,
                        "rx_bps": rx_bps_total,
                        "tx_bps": tx_bps_total,
                        "uptime_seconds": device.uptime_seconds,
                        "last_seen": now.isoformat(),
                    }
                    await ws_manager.broadcast("METRIC_UPDATE", broadcast_data)

                    if alert_created:
                        await ws_manager.broadcast("ALERT_TRIGGERED", {
                            "id": alert_created.id,
                            "device_id": device.id,
                            "severity": alert_created.severity.value,
                            "title": alert_created.title,
                            "message": alert_created.message,
                        })

                except Exception as err:
                    logger.warning(f"Error polling device {device_id}: {type(err).__name__}: {err}")
                    await session.rollback()

    async def _monitoring_loop(self):
        logger.info("Monitoring supervisor loop activated.")
        while self.is_running:
            start_poll = time.time()
            try:
                async with AsyncSessionLocal() as session:
                    stmt = select(Device.id).where(Device.is_monitored == True)
                    result = await session.execute(stmt)
                    device_ids = result.scalars().all()

                if device_ids:
                    tasks = [self._poll_single_device(did) for did in device_ids]
                    await asyncio.gather(*tasks, return_exceptions=True)
            except Exception as loop_err:
                logger.error(f"Error in polling loop cycle: {loop_err}")

            elapsed = time.time() - start_poll
            sleep_time = max(1.0, float(settings.DEFAULT_MONITORING_INTERVAL) - elapsed)
            try:
                await asyncio.sleep(sleep_time)
            except asyncio.CancelledError:
                break


scheduler = MonitoringScheduler()
