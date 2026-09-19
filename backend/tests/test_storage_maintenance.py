import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_storage_maintenance_and_crud():
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

        # 2. Storage Info
        info_resp = await client.get("/api/v1/system/storage-info", headers=headers)
        assert info_resp.status_code == 200
        storage_info = info_resp.json()
        assert "db_size_mb" in storage_info
        assert "samples_count" in storage_info
        assert "alerts_count" in storage_info

        # 3. Purge Samples
        samples_resp = await client.post(
            "/api/v1/system/purge-samples",
            headers=headers,
            json={"days_older_than": 30, "purge_all": False},
        )
        assert samples_resp.status_code == 200
        assert samples_resp.json()["success"] is True

        # 4. Purge Alerts
        alerts_resp = await client.post(
            "/api/v1/system/purge-alerts",
            headers=headers,
            json={"only_resolved": True},
        )
        assert alerts_resp.status_code == 200
        assert alerts_resp.json()["success"] is True

        # 5. Purge Events
        events_resp = await client.post(
            "/api/v1/system/purge-events",
            headers=headers,
            json={"days_older_than": 30},
        )
        assert events_resp.status_code == 200
        assert events_resp.json()["success"] is True

        # 6. Database VACUUM
        vacuum_resp = await client.post(
            "/api/v1/system/vacuum",
            headers=headers,
        )
        assert vacuum_resp.status_code == 200
        assert vacuum_resp.json()["success"] is True
