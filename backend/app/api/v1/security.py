from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.config_backup import ConfigBackup
from app.schemas.security import (
    PortAuditRequest,
    PortAuditReport,
    ConfigBackupCreate,
    ConfigBackupResponse,
    ConfigDiffRequest,
    ConfigDiffResponse,
)
from app.services.vulnerability_service import vulnerability_service
from app.services.audit_service import AuditService

router = APIRouter(prefix="/security", tags=["Cyber Security & Config Hub"])


@router.post("/port-audit", response_model=PortAuditReport)
async def audit_device_ports(
    req: PortAuditRequest,
    current_user: User = Depends(get_current_user),
):
    """Scans and audits vulnerable open network ports on target LAN device or server."""
    if not req.target or len(req.target.strip()) < 2:
        raise HTTPException(status_code=400, detail="Invalid target address specified.")
    return await vulnerability_service.audit_ports(
        target=req.target,
        custom_ports=req.custom_ports,
        timeout_seconds=req.timeout_seconds,
    )


@router.get("/config-backups", response_model=List[ConfigBackupResponse])
async def list_config_backups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists all stored router/switch configuration snapshots."""
    query = select(ConfigBackup).order_by(desc(ConfigBackup.created_at))
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/config-backups", response_model=ConfigBackupResponse)
async def create_config_backup(
    data: ConfigBackupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Saves a new router configuration backup snapshot."""
    file_size = len(data.config_content.encode("utf-8"))
    backup = ConfigBackup(
        backup_name=data.backup_name,
        device_id=data.device_id,
        device_name=data.device_name,
        config_content=data.config_content,
        file_size_bytes=file_size,
        description=data.description,
        created_by=current_user.username,
    )
    db.add(backup)
    await db.commit()
    await db.refresh(backup)

    try:
        await AuditService.record_log(
            session=db,
            action="CREATE_BACKUP",
            entity="CONFIG_BACKUP",
            entity_id=str(backup.id),
            username=current_user.username,
            user_id=current_user.id,
            description=f"Snapshot '{backup.backup_name}' ({round(file_size / 1024, 1)} KB) created by {current_user.username}.",
        )
    except Exception:
        pass

    return backup


@router.get("/config-backups/{backup_id}", response_model=ConfigBackupResponse)
async def get_config_backup(
    backup_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves a specific configuration snapshot by ID."""
    backup = await db.get(ConfigBackup, backup_id)
    if not backup:
        raise HTTPException(status_code=404, detail="Configuration backup not found.")
    return backup


@router.delete("/config-backups/{backup_id}")
async def delete_config_backup(
    backup_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deletes a configuration snapshot."""
    backup = await db.get(ConfigBackup, backup_id)
    if not backup:
        raise HTTPException(status_code=404, detail="Configuration backup not found.")
    await db.delete(backup)
    await db.commit()

    try:
        await AuditService.record_log(
            session=db,
            action="DELETE_BACKUP",
            entity="CONFIG_BACKUP",
            entity_id=str(backup_id),
            username=current_user.username,
            user_id=current_user.id,
            description=f"Config backup snapshot '{backup.backup_name}' was deleted.",
        )
    except Exception:
        pass

    return {"success": True, "message": f"Backup '{backup.backup_name}' deleted successfully."}


@router.post("/config-backups/diff", response_model=ConfigDiffResponse)
async def diff_config_backups(
    req: ConfigDiffRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Computes a color-coded unified diff between two configuration snapshots."""
    backup_a = await db.get(ConfigBackup, req.backup_id_a)
    backup_b = await db.get(ConfigBackup, req.backup_id_b)

    if not backup_a or not backup_b:
        raise HTTPException(status_code=404, detail="One or both configuration backups not found.")

    return vulnerability_service.diff_configs(
        config_a=backup_a.config_content,
        config_b=backup_b.config_content,
        name_a=backup_a.backup_name,
        name_b=backup_b.backup_name,
    )
