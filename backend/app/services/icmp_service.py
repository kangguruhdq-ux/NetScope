from __future__ import annotations

import asyncio
import os
import platform
import re
import socket
import struct
import time
from typing import NamedTuple, Optional


class PingResult(NamedTuple):
    is_alive: bool
    latency_ms: Optional[float]
    packet_loss_pct: float
    engine_used: str  # "raw_socket" or "subprocess"
    raw_output: str


class ICMPService:
    """
    Dual-Engine ICMP Ping Service.
    Safeguard 1: Raw socket first; on PermissionError/OS error, automatically fall back
    to Subprocess Execution with regex output parsing. Never crashes on non-root/non-admin.
    """

    @classmethod
    def _calculate_checksum(cls, source_bytes: bytes) -> int:
        count = len(source_bytes)
        count_to = (count // 2) * 2
        total = 0
        idx = 0
        while idx < count_to:
            val = source_bytes[idx + 1] * 256 + source_bytes[idx]
            total += val
            total &= 0xFFFFFFFF
            idx += 2
        if count_to < count:
            total += source_bytes[len(source_bytes) - 1]
            total &= 0xFFFFFFFF
        total = (total >> 16) + (total & 0xFFFF)
        total += total >> 16
        answer = ~total
        answer &= 0xFFFF
        return answer >> 8 | (answer << 8 & 0xFF00)

    @classmethod
    def _try_raw_ping(cls, host: str, timeout_seconds: float = 2.0) -> Optional[tuple[bool, float]]:
        """Attempts a raw ICMP socket ping. Returns (success, latency_ms) or raises/returns None."""
        try:
            icmp_proto = socket.getprotobyname("icmp")
            sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, icmp_proto)
        except (PermissionError, OSError):
            return None

        try:
            sock.settimeout(timeout_seconds)
            packet_id = os.getpid() & 0xFFFF
            seq_num = 1
            # ICMP Header: Type=8, Code=0, Checksum=0, ID, Seq
            header = struct.pack("!BBHHH", 8, 0, 0, packet_id, seq_num)
            payload = struct.pack("!d", time.time()) + b"NETSCOPE_PING"
            checksum = cls._calculate_checksum(header + payload)
            header = struct.pack("!BBHHH", 8, 0, checksum, packet_id, seq_num)
            packet = header + payload

            start_time = time.perf_counter()
            sock.sendto(packet, (host, 1))

            while True:
                recv_packet, addr = sock.recvfrom(1024)
                end_time = time.perf_counter()
                ip_header = recv_packet[:20]
                icmp_header = recv_packet[20:28]
                type_val, code, _, r_id, _ = struct.unpack("!BBHHH", icmp_header)
                if type_val == 0 and r_id == packet_id:
                    latency = (end_time - start_time) * 1000.0
                    return True, latency
        except Exception:
            return False, 0.0
        finally:
            sock.close()

    @classmethod
    async def _subprocess_ping(cls, host: str, count: int = 2, timeout_ms: int = 2000) -> PingResult:
        """Fallback ping using system subprocess."""
        is_windows = platform.system().lower() == "windows"
        if is_windows:
            cmd = ["ping", "-n", str(count), "-w", str(timeout_ms), host]
        else:
            timeout_sec = max(1, int(timeout_ms / 1000))
            cmd = ["ping", "-c", str(count), "-W", str(timeout_sec), host]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout_bytes, _ = await asyncio.wait_for(proc.communicate(), timeout=(timeout_ms / 1000.0 * count) + 2.0)
            output = stdout_bytes.decode(errors="replace")
        except Exception as err:
            return PingResult(
                is_alive=False,
                latency_ms=None,
                packet_loss_pct=100.0,
                engine_used="subprocess",
                raw_output=f"Ping process failed: {str(err)}",
            )

        # Regex parsing for latency and loss
        latency_match = re.findall(r"(?:time|waktu)[=<]\s*([0-9.]+)\s*ms", output, re.IGNORECASE)
        avg_match = re.search(r"(?:Average|Rata-rata|avg)[ =/]([0-9.]+)(?:ms)?", output, re.IGNORECASE)
        loss_match = re.search(r"(\d+)%\s*(?:loss|kehilangan)", output, re.IGNORECASE)

        loss_pct = 100.0
        if loss_match:
            try:
                loss_pct = float(loss_match.group(1))
            except ValueError:
                pass
        elif proc.returncode == 0:
            loss_pct = 0.0

        latency_ms: Optional[float] = None
        if avg_match:
            try:
                latency_ms = float(avg_match.group(1))
            except ValueError:
                pass
        elif latency_match:
            try:
                latencies = [float(x) for x in latency_match]
                if latencies:
                    latency_ms = sum(latencies) / len(latencies)
            except ValueError:
                pass

        # If latency is "<1ms", set to 0.5ms
        if latency_ms is None and ("<1ms" in output or "< 1ms" in output):
            latency_ms = 0.5

        is_alive = loss_pct < 100.0 and latency_ms is not None

        return PingResult(
            is_alive=is_alive,
            latency_ms=round(latency_ms, 2) if latency_ms is not None else None,
            packet_loss_pct=loss_pct,
            engine_used="subprocess",
            raw_output=output.strip(),
        )

    @classmethod
    async def ping(cls, host: str, count: int = 2, timeout_seconds: float = 2.0) -> PingResult:
        """
        Dual-Engine Ping:
        1. Attempts raw socket in thread pool.
        2. If raw socket raises PermissionError or fails, seamlessly falls back to subprocess ping.
        """
        # Quick validation
        try:
            socket.gethostbyname(host)
        except socket.error:
            return PingResult(
                is_alive=False,
                latency_ms=None,
                packet_loss_pct=100.0,
                engine_used="none",
                raw_output=f"Could not resolve host: {host}",
            )

        # Try raw socket in a non-blocking thread
        try:
            loop = asyncio.get_running_loop()
            raw_res = await loop.run_in_executor(None, cls._try_raw_ping, host, timeout_seconds)
            if raw_res is not None:
                success, latency = raw_res
                if success:
                    return PingResult(
                        is_alive=True,
                        latency_ms=round(latency, 2),
                        packet_loss_pct=0.0,
                        engine_used="raw_socket",
                        raw_output=f"Raw ICMP echo reply received in {round(latency, 2)}ms",
                    )
        except Exception:
            pass

        # Seamless fallback to subprocess ping
        return await cls._subprocess_ping(cls._clean_host(host), count=count, timeout_ms=int(timeout_seconds * 1000))

    @staticmethod
    def _clean_host(host: str) -> str:
        # Strip protocols if provided
        return host.replace("http://", "").replace("https://", "").split("/")[0].split(":")[0]
