from __future__ import annotations

import asyncio
import time
from typing import Dict, Optional, Tuple
import httpx


class TCPHTTPService:
    @staticmethod
    async def check_port(host: str, port: int, timeout_seconds: float = 1.5) -> Tuple[bool, float]:
        """
        Non-blocking TCP port check using asyncio.open_connection.
        Returns (is_open, response_time_ms).
        """
        start = time.perf_counter()
        try:
            conn = asyncio.open_connection(host, port)
            reader, writer = await asyncio.wait_for(conn, timeout=timeout_seconds)
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass
            elapsed = (time.perf_counter() - start) * 1000.0
            return True, round(elapsed, 2)
        except Exception:
            elapsed = (time.perf_counter() - start) * 1000.0
            return False, round(elapsed, 2)

    @classmethod
    async def check_ports_bulk(cls, host: str, ports: list[int], timeout_seconds: float = 1.5) -> Dict[int, bool]:
        """Checks multiple TCP ports concurrently."""
        tasks = [cls.check_port(host, p, timeout_seconds) for p in ports]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        res_map = {}
        for p, r in zip(ports, results):
            if isinstance(r, tuple):
                res_map[p] = r[0]
            else:
                res_map[p] = False
        return res_map

    @staticmethod
    async def check_http(url: str, timeout_seconds: float = 2.5) -> Tuple[bool, Optional[int], float, str]:
        """
        HTTP health check.
        Returns (is_healthy, status_code, response_time_ms, message).
        """
        start = time.perf_counter()
        try:
            async with httpx.AsyncClient(verify=False, timeout=timeout_seconds, follow_redirects=True) as client:
                resp = await client.get(url)
                elapsed = (time.perf_counter() - start) * 1000.0
                is_healthy = 200 <= resp.status_code < 400
                return is_healthy, resp.status_code, round(elapsed, 2), f"HTTP status {resp.status_code}"
        except httpx.TimeoutException:
            elapsed = (time.perf_counter() - start) * 1000.0
            return False, None, round(elapsed, 2), "Connection timed out"
        except Exception as e:
            elapsed = (time.perf_counter() - start) * 1000.0
            return False, None, round(elapsed, 2), f"HTTP Error: {str(e)}"
