from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import ssl
import socket
import time
from urllib.parse import urlparse
from typing import Dict, Any, List, Optional, Tuple

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.web_sentinel import WebTarget, WebCheckResult, WebStatus
from app.schemas.web_sentinel import WebScanResponse


class WebSentinelService:
    CRITICAL_HEADERS = [
        "strict-transport-security",
        "content-security-policy",
        "x-frame-options",
        "x-content-type-options",
        "referrer-policy",
    ]

    @classmethod
    def _inspect_ssl(cls, hostname: str, port: int = 443, timeout: float = 3.0) -> Tuple[bool, Optional[str], Optional[datetime], Optional[int], Optional[str], Optional[str]]:
        """Synchronously connects via SSL and extracts peer certificate, TLS version, and cipher suite."""
        ctx = ssl.create_default_context()
        try:
            with socket.create_connection((hostname, port), timeout=timeout) as sock:
                with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    tls_version = ssock.version()
                    cipher_info = ssock.cipher()
                    cipher_suite = cipher_info[0] if cipher_info else None

                    if not cert:
                        return False, None, None, None, tls_version, cipher_suite

                    # Extract Issuer
                    issuer_parts = []
                    for item in cert.get("issuer", ()):
                        for k, v in item:
                            if k in ("commonName", "organizationName"):
                                issuer_parts.append(v)
                    issuer_str = ", ".join(issuer_parts) if issuer_parts else "Standard CA"

                    # Extract Expiration date
                    not_after_str = cert.get("notAfter")
                    if not_after_str:
                        expires_at = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                        now = datetime.now(timezone.utc)
                        days_remaining = (expires_at - now).days
                        is_valid = days_remaining > 0
                        return is_valid, issuer_str, expires_at, days_remaining, tls_version, cipher_suite

                    return True, issuer_str, None, None, tls_version, cipher_suite
        except Exception:
            return False, None, None, None, None, None

    @classmethod
    def _evaluate_security(
        cls,
        is_https: bool,
        ssl_valid: Optional[bool],
        ssl_days: Optional[int],
        headers: Dict[str, str],
        server_header: Optional[str],
    ) -> Tuple[str, Dict[str, Any], List[str], List[str]]:
        headers_lower = {k.lower(): v for k, v in headers.items()}
        sec_audit: Dict[str, Any] = {}
        threats: List[str] = []
        recommendations: List[str] = []

        # Check critical security headers
        hsts_present = "strict-transport-security" in headers_lower
        csp_present = "content-security-policy" in headers_lower
        xfo_present = "x-frame-options" in headers_lower
        xcto_present = "x-content-type-options" in headers_lower
        rp_present = "referrer-policy" in headers_lower

        sec_audit["hsts"] = {"present": hsts_present, "value": headers_lower.get("strict-transport-security")}
        sec_audit["csp"] = {"present": csp_present, "value": headers_lower.get("content-security-policy")}
        sec_audit["x_frame_options"] = {"present": xfo_present, "value": headers_lower.get("x-frame-options")}
        sec_audit["x_content_type_options"] = {"present": xcto_present, "value": headers_lower.get("x-content-type-options")}
        sec_audit["referrer_policy"] = {"present": rp_present, "value": headers_lower.get("referrer-policy")}

        score_points = 0

        if is_https:
            if ssl_valid:
                score_points += 30
                if ssl_days is not None and ssl_days < 14:
                    threats.append(f"SSL certificate expires soon ({ssl_days} days left).")
                    recommendations.append("Renew SSL/TLS certificate to prevent browser security warnings.")
            else:
                threats.append("Invalid or untrusted SSL/TLS certificate detected.")
                recommendations.append("Install a valid CA-signed SSL/TLS certificate.")
        else:
            threats.append("Insecure plain HTTP protocol in use without SSL/TLS encryption.")
            recommendations.append("Migrate web service to HTTPS to prevent credential interception.")

        if hsts_present:
            score_points += 20
        elif is_https:
            threats.append("Missing Strict-Transport-Security (HSTS) header.")
            recommendations.append("Enable HSTS header with max-age >= 31536000 to enforce encrypted connections.")

        if csp_present:
            score_points += 20
        else:
            threats.append("Missing Content-Security-Policy (CSP) header (vulnerable to XSS).")
            recommendations.append("Define a strict Content-Security-Policy to mitigate Cross-Site Scripting.")

        if xfo_present:
            score_points += 15
        else:
            threats.append("Missing X-Frame-Options header (vulnerable to clickjacking).")
            recommendations.append("Configure 'X-Frame-Options: SAMEORIGIN' to protect against UI redressing.")

        if xcto_present:
            score_points += 10
        else:
            recommendations.append("Configure 'X-Content-Type-Options: nosniff' to prevent MIME confusion attacks.")

        if rp_present:
            score_points += 5

        # Check server info disclosure
        if server_header and any(c.isdigit() for c in server_header):
            threats.append(f"Server version banner disclosed: '{server_header}'.")
            recommendations.append("Hide web server signature/version token in server configuration.")

        # Calculate grade
        if score_points >= 90:
            grade = "A+"
        elif score_points >= 80:
            grade = "A"
        elif score_points >= 60:
            grade = "B"
        elif score_points >= 40:
            grade = "C"
        else:
            grade = "F"

        return grade, sec_audit, threats, recommendations

    @classmethod
    async def probe_url(cls, raw_url: str, timeout_seconds: float = 5.0) -> WebScanResponse:
        url = raw_url.strip()
        if not url.startswith("http://") and not url.startswith("https://"):
            url = f"https://{url}"

        parsed = urlparse(url)
        hostname = parsed.hostname or "localhost"
        is_https = parsed.scheme == "https"
        port = parsed.port or (443 if is_https else 80)

        loop = asyncio.get_running_loop()

        # 1. Measure DNS Lookup time and resolved IP
        dns_start = time.perf_counter()
        resolved_ip = None
        try:
            resolved_ip = await loop.run_in_executor(None, socket.gethostbyname, hostname)
            dns_time_ms = round((time.perf_counter() - dns_start) * 1000.0, 2)
        except Exception:
            dns_time_ms = None

        # 2. Inspect SSL if HTTPS
        ssl_valid = None
        ssl_issuer = None
        ssl_expires_at = None
        ssl_days_remaining = None
        tls_version = None
        cipher_suite = None
        if is_https:
            try:
                ssl_valid, ssl_issuer, ssl_expires_at, ssl_days_remaining, tls_version, cipher_suite = await loop.run_in_executor(
                    None, cls._inspect_ssl, hostname, port, min(3.0, timeout_seconds)
                )
            except Exception:
                ssl_valid = False

        # 3. HTTP Request for Status, TTFB, and Security Headers
        http_status = None
        response_time_ms = None
        content_length = None
        server_header = None
        headers_dict: Dict[str, str] = {}
        error_msg = None
        is_online = False
        http_version = None
        redirect_chain: List[str] = []
        payload_size_kb = None

        req_start = time.perf_counter()
        try:
            async with httpx.AsyncClient(
                verify=False,  # Allow self-signed probes while still reporting ssl_valid accurately
                timeout=timeout_seconds,
                follow_redirects=True,
            ) as client:
                resp = await client.get(url, headers={"User-Agent": "NetScope-WebSentinel/1.0"})
                response_time_ms = round((time.perf_counter() - req_start) * 1000.0, 2)
                http_status = resp.status_code
                content_length = len(resp.content)
                payload_size_kb = round(content_length / 1024.0, 2)
                headers_dict = dict(resp.headers)
                server_header = resp.headers.get("server")
                http_version = getattr(resp, "http_version", "HTTP/1.1")
                if resp.history:
                    redirect_chain = [str(r.url) for r in resp.history] + [str(resp.url)]
                is_online = http_status < 500
        except httpx.ConnectTimeout:
            error_msg = "Connection timed out (Host unreachable or firewall dropping packets)."
        except httpx.ConnectError as ce:
            error_msg = f"Connection refused or network unreachable: {str(ce)}"
        except Exception as ex:
            error_msg = f"HTTP Probe error: {str(ex)}"

        # Status determination
        if not is_online:
            web_status = WebStatus.DOWN
        elif http_status and http_status >= 400:
            web_status = WebStatus.DEGRADED
        elif response_time_ms and response_time_ms > 2000.0:
            web_status = WebStatus.DEGRADED
        else:
            web_status = WebStatus.ONLINE

        # 4. Evaluate Security Grade & Threats
        grade, sec_audit, threats, recs = cls._evaluate_security(
            is_https=is_https,
            ssl_valid=ssl_valid,
            ssl_days=ssl_days_remaining,
            headers=headers_dict,
            server_header=server_header,
        )

        if error_msg and not is_online:
            threats.insert(0, f"Downtime incident: {error_msg}")

        return WebScanResponse(
            url=url,
            is_online=is_online,
            status=web_status,
            http_status=http_status,
            response_time_ms=response_time_ms,
            dns_lookup_ms=dns_time_ms,
            content_length=content_length,
            server_header=server_header,
            ssl_valid=ssl_valid,
            ssl_issuer=ssl_issuer,
            ssl_expires_at=ssl_expires_at,
            ssl_days_remaining=ssl_days_remaining,
            security_score=grade,
            security_headers=sec_audit,
            threat_indicators=threats,
            recommendations=recs,
            error_message=error_msg,
            resolved_ip=resolved_ip,
            tls_version=tls_version,
            cipher_suite=cipher_suite,
            http_version=http_version,
            redirect_chain=redirect_chain if redirect_chain else None,
            raw_headers=headers_dict,
            payload_size_kb=payload_size_kb,
        )

    @classmethod
    async def check_target(cls, session: AsyncSession, target: WebTarget) -> WebCheckResult:
        scan = await cls.probe_url(target.url, timeout_seconds=target.timeout_seconds)

        if scan.resolved_ip:
            target.resolved_ip = scan.resolved_ip
            session.add(target)

        result = WebCheckResult(
            target_id=target.id,
            timestamp=datetime.now(timezone.utc),
            status=scan.status,
            http_status=scan.http_status,
            response_time_ms=scan.response_time_ms,
            dns_lookup_ms=scan.dns_lookup_ms,
            content_length=scan.content_length,
            server_header=scan.server_header,
            ssl_valid=scan.ssl_valid,
            ssl_issuer=scan.ssl_issuer,
            ssl_expires_at=scan.ssl_expires_at,
            ssl_days_remaining=scan.ssl_days_remaining,
            security_score=scan.security_score,
            security_headers=scan.security_headers,
            threat_indicators=scan.threat_indicators,
            error_message=scan.error_message,
            # Transport & Network Telemetry
            resolved_ip=scan.resolved_ip,
            tls_version=scan.tls_version,
            cipher_suite=scan.cipher_suite,
            http_version=scan.http_version,
            payload_size_kb=scan.payload_size_kb,
            redirect_chain=scan.redirect_chain,
            raw_headers=scan.raw_headers,
        )
        session.add(result)
        await session.commit()
        await session.refresh(result)
        return result

