import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_web_sentinel_crud_and_scan():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Admin Login
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username_or_email": settings.DEFAULT_ADMIN_USERNAME,
                "password": settings.DEFAULT_ADMIN_PASSWORD,
            },
        )
        assert login_resp.status_code == 200
        admin_token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. List Web Targets
        targets_resp = await client.get("/api/v1/web-sentinel/targets", headers=headers)
        assert targets_resp.status_code == 200
        initial_targets = targets_resp.json()
        assert isinstance(initial_targets, list)

        # 3. Create Web Target
        create_resp = await client.post(
            "/api/v1/web-sentinel/targets",
            headers=headers,
            json={
                "name": "Cloudflare Test Sentinel",
                "url": "https://1.1.1.1",
                "check_interval_seconds": 60,
                "expected_status_code": 200,
                "timeout_seconds": 5,
            },
        )
        assert create_resp.status_code == 200
        created_target = create_resp.json()
        target_id = created_target["id"]
        assert created_target["name"] == "Cloudflare Test Sentinel"

        # 4. Probe Target
        probe_resp = await client.post(
            f"/api/v1/web-sentinel/targets/{target_id}/probe",
            headers=headers,
        )
        assert probe_resp.status_code == 200
        probe_data = probe_resp.json()
        assert "status" in probe_data
        assert "response_time_ms" in probe_data

        # 5. Live URL Scan
        scan_resp = await client.post(
            "/api/v1/web-sentinel/scan",
            headers=headers,
            json={"url": "https://dns.google"},
        )
        assert scan_resp.status_code == 200
        scan_data = scan_resp.json()
        assert scan_data["url"] == "https://dns.google"
        assert "security_score" in scan_data
        assert "security_headers" in scan_data
        assert "ssl_valid" in scan_data

        # 6. Bulk Delete Web Targets
        bulk_del_resp = await client.post(
            "/api/v1/web-sentinel/targets/bulk-delete",
            headers=headers,
            json={"ids": [target_id]},
        )
        assert bulk_del_resp.status_code == 200
        del_data = bulk_del_resp.json()
        assert del_data["success"] is True
        assert del_data["deleted_count"] >= 1
