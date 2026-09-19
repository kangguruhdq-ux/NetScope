import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_admin_and_user_crud():
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
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. List Users (Admin)
        users_resp = await client.get("/api/v1/users", headers=admin_headers)
        assert users_resp.status_code == 200
        assert len(users_resp.json()) >= 1

        # 3. Create User (Admin)
        test_username = "crud_test_user"
        create_resp = await client.post(
            "/api/v1/users",
            headers=admin_headers,
            json={
                "username": test_username,
                "full_name": "CRUD Test Operator",
                "email": "crud_test@netscope.net",
                "role": "OPERATOR",
                "password": "TestPassword123!",
            },
        )
        assert create_resp.status_code in [200, 400]
        if create_resp.status_code == 400:
            for u in users_resp.json():
                if u["username"] == test_username:
                    await client.delete(f"/api/v1/users/{u['id']}", headers=admin_headers)
            create_resp = await client.post(
                "/api/v1/users",
                headers=admin_headers,
                json={
                    "username": test_username,
                    "full_name": "CRUD Test Operator",
                    "email": "crud_test@netscope.net",
                    "role": "OPERATOR",
                    "password": "TestPassword123!",
                },
            )
        assert create_resp.status_code == 200
        user_id = create_resp.json()["id"]

        # 4. Admin Reset Password
        reset_resp = await client.post(
            f"/api/v1/users/{user_id}/reset-password",
            headers=admin_headers,
            json={"new_password": "NewSecretPassword123!"},
        )
        assert reset_resp.status_code == 200

        # 5. User Login with new password
        user_login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username_or_email": test_username,
                "password": "NewSecretPassword123!",
            },
        )
        assert user_login_resp.status_code == 200
        user_token = user_login_resp.json()["access_token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}

        # 6. User CRUD: Update Own Profile
        profile_update_resp = await client.put(
            "/api/v1/users/profile",
            headers=user_headers,
            json={
                "full_name": "CRUD Test Operator Updated",
                "email": "crud_updated@netscope.net",
            },
        )
        assert profile_update_resp.status_code == 200
        assert profile_update_resp.json()["full_name"] == "CRUD Test Operator Updated"

        # 7. Admin Delete User
        delete_resp = await client.delete(f"/api/v1/users/{user_id}", headers=admin_headers)
        assert delete_resp.status_code == 200
