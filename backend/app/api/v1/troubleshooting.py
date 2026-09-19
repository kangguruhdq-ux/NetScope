from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.device import Device
from app.schemas.troubleshooting import DiagnosticRunRequest, TroubleshootingReportResponse
from app.services.troubleshooting_service import TroubleshootingService
from app.api.deps import get_current_user

router = APIRouter(prefix="/troubleshooting", tags=["Troubleshooting"])


@router.post("/run", response_model=TroubleshootingReportResponse)
async def run_diagnostics(
    req: DiagnosticRunRequest,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    stmt = select(Device).where(Device.id == req.device_id)
    device = (await session.execute(stmt)).scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Target device not found")

    report = await TroubleshootingService.run_diagnostics(device)
    return report
