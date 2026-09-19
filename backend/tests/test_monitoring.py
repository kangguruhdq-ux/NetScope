import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.services.icmp_service import ICMPService


@pytest.mark.asyncio
async def test_icmp_dual_engine_ping():
    # Ping localhost
    res = await ICMPService.ping("127.0.0.1", count=1)
    assert res.is_alive is True
    assert res.latency_ms is not None
    assert res.packet_loss_pct == 0.0


@pytest.mark.asyncio
async def test_devices_list_authenticated():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login first
        login_res = await client.post(
            "/api/v1/auth/login",
            json={
                "username_or_email": settings.DEFAULT_ADMIN_USERNAME,
                "password": settings.DEFAULT_ADMIN_PASSWORD,
            },
        )
        token = login_res.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}
        dev_res = await client.get("/api/v1/devices", headers=headers)
        assert dev_res.status_code == 200
        devices = dev_res.json()
        assert len(devices) >= 8  # Initial seeded devices
