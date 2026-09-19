from __future__ import annotations

import asyncio
import ipaddress
import socket
from typing import List, Set
from app.services.icmp_service import ICMPService
from app.services.tcp_http_service import TCPHTTPService
from app.schemas.discovery import DiscoveredDeviceResponse


class DiscoveryService:
    COMMON_PORTS = [22, 53, 80, 443, 161, 8291]

    @classmethod
    async def scan_host(
        cls,
        ip_str: str,
        ports: List[int],
        timeout_seconds: float,
        sem: asyncio.Semaphore,
        monitored_ips: Set[str],
    ) -> DiscoveredDeviceResponse:
        async with sem:
            # 1. Ping test
            ping_res = await ICMPService.ping(ip_str, count=1, timeout_seconds=timeout_seconds)

            open_ports: List[int] = []
            hostname: str | None = None

            if ping_res.is_alive:
                # Resolve hostname non-blocking
                try:
                    loop = asyncio.get_running_loop()
                    name, _, _ = await loop.run_in_executor(None, socket.gethostbyaddr, ip_str)
                    hostname = name
                except Exception:
                    hostname = None

                # Check ports
                port_map = await TCPHTTPService.check_ports_bulk(ip_str, ports, timeout_seconds=min(1.0, timeout_seconds))
                open_ports = [p for p, is_open in port_map.items() if is_open]

            # Detect suggested device type
            suggested_type = "OTHER"
            if 8291 in open_ports:
                suggested_type = "ROUTER"  # Mikrotik Winbox
            elif 161 in open_ports and (22 in open_ports or 23 in open_ports):
                suggested_type = "SWITCH"
            elif 80 in open_ports or 443 in open_ports:
                suggested_type = "SERVER"
            elif ping_res.is_alive:
                suggested_type = "PC"

            return DiscoveredDeviceResponse(
                ip_address=ip_str,
                hostname=hostname,
                is_alive=ping_res.is_alive,
                latency_ms=ping_res.latency_ms,
                open_ports=open_ports,
                suggested_type=suggested_type,
                already_monitored=(ip_str in monitored_ips),
            )

    @classmethod
    async def scan_subnet(
        cls,
        subnet_cidr: str,
        ports: List[int] | None = None,
        timeout_seconds: float = 1.5,
        monitored_ips: Set[str] | None = None,
    ) -> List[DiscoveredDeviceResponse]:
        if ports is None:
            ports = cls.COMMON_PORTS
        if monitored_ips is None:
            monitored_ips = set()

        net = ipaddress.ip_network(subnet_cidr, strict=False)
        # Limit subnet scan to max /24 (256 hosts) to avoid runaway resource consumption
        hosts = [str(ip) for ip in net.hosts()]
        if len(hosts) > 256:
            hosts = hosts[:256]

        sem = asyncio.Semaphore(16)
        tasks = [
            cls.scan_host(
                ip_str=ip,
                ports=ports,
                timeout_seconds=timeout_seconds,
                sem=sem,
                monitored_ips=monitored_ips,
            )
            for ip in hosts
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)
        discovered: List[DiscoveredDeviceResponse] = []
        for r in results:
            if isinstance(r, DiscoveredDeviceResponse) and r.is_alive:
                discovered.append(r)

        return discovered
