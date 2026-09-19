import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_security_hub_and_config_diff():
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

        # 2. Port Audit (Audit 127.0.0.1 with standard ports)
        audit_resp = await client.post(
            "/api/v1/security/port-audit",
            headers=headers,
            json={"target": "127.0.0.1", "timeout_seconds": 0.5},
        )
        assert audit_resp.status_code == 200
        audit_data = audit_resp.json()
        assert audit_data["target_ip"] == "127.0.0.1"
        assert "overall_verdict" in audit_data
        assert "security_score" in audit_data
        assert "vulnerabilities" in audit_data
        assert "hardening_advisories" in audit_data

        # 3. List Config Backups (seeded in db_init)
        list_resp = await client.get("/api/v1/security/config-backups", headers=headers)
        assert list_resp.status_code == 200
        backups = list_resp.json()
        assert isinstance(backups, list)
        assert len(backups) >= 2

        id_a = backups[0]["id"]
        id_b = backups[1]["id"]

        # 4. Config Diff between the two seeded snapshots
        diff_resp = await client.post(
            "/api/v1/security/config-backups/diff",
            headers=headers,
            json={"backup_id_a": id_a, "backup_id_b": id_b},
        )
        assert diff_resp.status_code == 200
        diff_data = diff_resp.json()
        assert "diff_lines" in diff_data
        assert "added_lines_count" in diff_data
        assert "removed_lines_count" in diff_data

        # 5. Create new Config Snapshot
        create_resp = await client.post(
            "/api/v1/security/config-backups",
            headers=headers,
            json={
                "backup_name": "Test-Switch-Config.cfg",
                "device_name": "Edge-Switch-01",
                "config_content": "vlan 10 name Students\nvlan 20 name Faculty\ninterface GigabitEthernet0/1\n switchport mode access",
                "description": "Automated test switch snapshot",
            },
        )
        assert create_resp.status_code == 200
        created_backup = create_resp.json()
        new_id = created_backup["id"]
        assert created_backup["backup_name"] == "Test-Switch-Config.cfg"

        # 6. Delete created Config Snapshot
        del_resp = await client.delete(f"/api/v1/security/config-backups/{new_id}", headers=headers)
        assert del_resp.status_code == 200
        assert del_resp.json()["success"] is True
