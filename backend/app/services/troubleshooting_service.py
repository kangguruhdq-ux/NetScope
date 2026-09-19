from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import socket
import time
from typing import List
from app.models.device import Device
from app.services.icmp_service import ICMPService
from app.services.tcp_http_service import TCPHTTPService
from app.services.snmp_service import SNMPService
from app.schemas.troubleshooting import DiagnosticStepResult, TroubleshootingReportResponse


class TroubleshootingService:
    @classmethod
    async def run_diagnostics(cls, device: Device) -> TroubleshootingReportResponse:
        steps: List[DiagnosticStepResult] = []
        start_overall = time.perf_counter()

        # Step 1: ICMP Ping Reachability
        s1_start = time.perf_counter()
        ping_res = await ICMPService.ping(device.ip_address, count=3, timeout_seconds=2.0)
        s1_duration = (time.perf_counter() - s1_start) * 1000.0

        if ping_res.is_alive and ping_res.packet_loss_pct == 0:
            s1_status = "PASSED"
            s1_msg = f"Host reachable with {ping_res.latency_ms}ms latency and 0% packet loss ({ping_res.engine_used})."
        elif ping_res.is_alive:
            s1_status = "WARNING"
            s1_msg = f"Host reachable but experiencing {ping_res.packet_loss_pct}% packet loss. Latency: {ping_res.latency_ms}ms."
        else:
            s1_status = "FAILED"
            s1_msg = f"Host is completely unreachable via ICMP echo requests (100% packet loss)."

        steps.append(DiagnosticStepResult(
            step_id="icmp_reachability",
            title="1. ICMP Ping Reachability",
            status=s1_status,
            duration_ms=round(s1_duration, 2),
            message=s1_msg,
            details={
                "is_alive": ping_res.is_alive,
                "latency_ms": ping_res.latency_ms,
                "packet_loss_pct": ping_res.packet_loss_pct,
                "engine": ping_res.engine_used,
            },
        ))

        # Step 2: DNS Reverse Lookup
        s2_start = time.perf_counter()
        dns_status = "FAILED"
        dns_msg = "Reverse DNS lookup failed or no PTR record found."
        resolved_name = None
        try:
            loop = asyncio.get_running_loop()
            name, _, _ = await loop.run_in_executor(None, socket.gethostbyaddr, device.ip_address)
            resolved_name = name
            dns_status = "PASSED"
            dns_msg = f"Reverse DNS resolved PTR to '{name}'."
        except Exception as e:
            dns_msg = f"No PTR record for {device.ip_address} ({str(e)})."
        s2_duration = (time.perf_counter() - s2_start) * 1000.0

        steps.append(DiagnosticStepResult(
            step_id="dns_reverse_lookup",
            title="2. DNS Reverse Lookup",
            status=dns_status,
            duration_ms=round(s2_duration, 2),
            message=dns_msg,
            details={"resolved_hostname": resolved_name},
        ))

        # Step 3: TCP Port Check
        s3_start = time.perf_counter()
        ports_to_check = device.tcp_check_ports if device.tcp_check_ports else [80, 443, 22, 161, 8291]
        port_results = await TCPHTTPService.check_ports_bulk(device.ip_address, ports_to_check, timeout_seconds=1.5)
        s3_duration = (time.perf_counter() - s3_start) * 1000.0

        open_ports = [p for p, open_status in port_results.items() if open_status]
        if len(open_ports) > 0:
            s3_status = "PASSED"
            s3_msg = f"Open ports detected: {open_ports}."
        elif ping_res.is_alive:
            s3_status = "WARNING"
            s3_msg = f"Host responds to ping, but all tested ports ({ports_to_check}) are closed or filtered by firewall."
        else:
            s3_status = "FAILED"
            s3_msg = f"No TCP connection could be established to ports {ports_to_check}."

        steps.append(DiagnosticStepResult(
            step_id="tcp_port_check",
            title="3. TCP Port Check",
            status=s3_status,
            duration_ms=round(s3_duration, 2),
            message=s3_msg,
            details={"checked_ports": ports_to_check, "port_states": port_results},
        ))

        # Step 4: SNMP Query Responsiveness
        s4_start = time.perf_counter()
        if "SNMP" in (device.protocols or []):
            snmp_ok, sys_descr, uptime_ticks, sys_name, snmp_msg = await SNMPService.get_system_info(
                host=device.ip_address,
                community=device.snmp_community or "public",
                port=device.snmp_port or 161,
                timeout_seconds=2.0,
            )
            s4_duration = (time.perf_counter() - s4_start) * 1000.0
            s4_status = "PASSED" if snmp_ok else "FAILED"
            steps.append(DiagnosticStepResult(
                step_id="snmp_responsiveness",
                title="4. SNMP Query Responsiveness",
                status=s4_status,
                duration_ms=round(s4_duration, 2),
                message=snmp_msg,
                details={
                    "community": device.snmp_community,
                    "sys_descr": sys_descr,
                    "sys_name": sys_name,
                    "uptime_ticks": uptime_ticks,
                },
            ))
        else:
            s4_duration = (time.perf_counter() - s4_start) * 1000.0
            steps.append(DiagnosticStepResult(
                step_id="snmp_responsiveness",
                title="4. SNMP Query Responsiveness",
                status="SKIPPED",
                duration_ms=round(s4_duration, 2),
                message="SNMP protocol is not enabled for this device configuration.",
                details={},
            ))

        # Root Cause Analysis & Recommendations
        recommendations: List[str] = []
        if s1_status == "FAILED":
            overall_verdict = "OFFLINE"
            root_cause = (
                f"Device {device.name} ({device.ip_address}) is completely unreachable on the network. "
                "The physical link or power supply is likely interrupted, or an upstream switch port is down."
            )
            recommendations.append("Inspect physical power supply, PoE injector, and patch cable connecting the device.")
            recommendations.append("Verify the upstream switch port link LED status and VLAN configuration.")
            recommendations.append("Ensure the NetScope monitoring host has an active IP route to this subnet.")
        elif s1_status == "WARNING":
            overall_verdict = "DEGRADED"
            root_cause = (
                f"Device {device.name} is reachable but packet loss is occurring ({ping_res.packet_loss_pct}%). "
                "This indicates network congestion, RF interference (if wireless), or a damaged Ethernet cable."
            )
            recommendations.append("Check interface CRC errors and speed/duplex mismatch on the switch port.")
            recommendations.append("Verify wireless signal strength (RSSI) and channel utilization if connecting an AP.")
            recommendations.append("Monitor upstream bandwidth utilization for bufferbloat.")
        else:
            if any(s.status == "FAILED" for s in steps):
                overall_verdict = "DEGRADED"
                root_cause = (
                    f"Physical connectivity to {device.name} is stable, but higher-layer services are encountering issues."
                )
                if s3_status == "FAILED" or s3_status == "WARNING":
                    recommendations.append("Check host firewall rules (Windows Defender Firewall or iptables) to allow management ports.")
                if len(steps) > 3 and steps[3].status == "FAILED":
                    recommendations.append(f"Verify SNMP agent is running on {device.ip_address} and community '{device.snmp_community}' is allowed.")
            else:
                overall_verdict = "HEALTHY"
                root_cause = f"All diagnostic layers (ICMP, Port, Protocol) are operating optimally with low latency."
                recommendations.append("No remediation needed. Device is healthy and within normal operating parameters.")

        return TroubleshootingReportResponse(
            device_id=device.id,
            device_name=device.name,
            ip_address=device.ip_address,
            executed_at=datetime.now(timezone.utc),
            overall_verdict=overall_verdict,
            steps=steps,
            root_cause_analysis=root_cause,
            recommendations=recommendations,
        )
