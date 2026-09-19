import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "NetScope"
        assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_admin_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "username_or_email": settings.DEFAULT_ADMIN_USERNAME,
                "password": settings.DEFAULT_ADMIN_PASSWORD,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["username"] == "admin"
        assert data["user"]["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_user_registration():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Test Operator",
                "username": "test_operator",
                "email": "operator@test.school.net",
                "password": "Password123!",
            },
        )
        # Should succeed or return 400 if already exists
        assert response.status_code in [200, 400]
