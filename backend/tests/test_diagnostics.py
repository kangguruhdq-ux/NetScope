import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_diagnostics_suite():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login Admin
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username_or_email": settings.DEFAULT_ADMIN_USERNAME,
                "password": settings.DEFAULT_ADMIN_PASSWORD,
            },
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Host System Stats (Live psutil)
        host_resp = await client.get("/api/v1/monitoring/host-system-stats", headers=headers)
        assert host_resp.status_code == 200
        host_data = host_resp.json()
        assert "cpu_percent" in host_data
        assert "ram_percent" in host_data
        assert "disk_percent" in host_data
        assert "host_uptime_seconds" in host_data
        assert host_data["cpu_cores_count"] > 0

        # 3. Interface Stats (psutil NICs & storm detection)
        iface_resp = await client.get("/api/v1/diagnostics/interface-stats", headers=headers)
        assert iface_resp.status_code == 200
        iface_data = iface_resp.json()
        assert "interfaces" in iface_data
        assert "global_storm_alert" in iface_data
        assert isinstance(iface_data["interfaces"], list)

        # 4. DNS Resolver Benchmark
        dns_resp = await client.post(
            "/api/v1/diagnostics/dns-benchmark",
            headers=headers,
            json={"domain": "google.com", "record_types": ["A", "AAAA"]},
        )
        assert dns_resp.status_code == 200
        dns_data = dns_resp.json()
        assert dns_data["domain"] == "google.com"
        assert "resolver_benchmarks" in dns_data
        assert len(dns_data["resolver_benchmarks"]) > 0
        assert "anti_spoofing_status" in dns_data

        # 5. Speedtest
        speed_resp = await client.post(
            "/api/v1/diagnostics/speedtest",
            headers=headers,
            json={"test_type": "all", "sample_size_mb": 1},
        )
        assert speed_resp.status_code == 200
        speed_data = speed_resp.json()
        assert "download_mbps" in speed_data
        assert "upload_mbps" in speed_data
        assert "bufferbloat_grade" in speed_data

        # 6. Traceroute to 127.0.0.1 (fast local hop)
        trace_resp = await client.post(
            "/api/v1/diagnostics/traceroute",
            headers=headers,
            json={"target": "127.0.0.1", "max_hops": 2, "timeout_seconds": 2.0},
        )
        assert trace_resp.status_code == 200
        trace_data = trace_resp.json()
        assert trace_data["target"] == "127.0.0.1"
        assert "hops" in trace_data
        assert isinstance(trace_data["hops"], list)
