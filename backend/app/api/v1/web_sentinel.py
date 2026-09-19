from __future__ import annotations

from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.web_sentinel import WebTarget, WebCheckResult
from app.schemas.web_sentinel import (
    WebTargetCreate,
    WebTargetUpdate,
    WebTargetResponse,
    WebCheckResultResponse,
    WebScanRequest,
    WebScanResponse,
)
from app.schemas.system import BulkDeleteIntRequest, SystemActionResponse
from app.services.web_sentinel_service import WebSentinelService
from app.services.audit_service import AuditService
from app.api.deps import get_current_user, get_current_operator_or_admin

router = APIRouter(prefix="/web-sentinel", tags=["Web & Cyber Sentinel"])


from app.models.user import UserRole

@router.get("/targets", response_model=List[WebTargetResponse])
async def list_targets(
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    if current_user.role == UserRole.ADMIN:
        stmt = select(WebTarget).order_by(WebTarget.id.asc())
    else:
        stmt = select(WebTarget).where(
            (WebTarget.user_id == current_user.id) | (WebTarget.user_id.is_(None))
        ).order_by(WebTarget.id.asc())

    targets = (await session.execute(stmt)).scalars().all()

    enriched = []
    need_commit = False
    for t in targets:
        # Fetch latest result
        res_stmt = (
            select(WebCheckResult)
            .where(WebCheckResult.target_id == t.id)
            .order_by(desc(WebCheckResult.timestamp))
            .limit(1)
        )
        latest = (await session.execute(res_stmt)).scalar_one_or_none()

        t_resp = WebTargetResponse.model_validate(t)
        if latest:
            latest_resp = WebCheckResultResponse.model_validate(latest)
            if not latest_resp.resolved_ip:
                if t.resolved_ip:
                    latest_resp.resolved_ip = t.resolved_ip
                else:
                    try:
                        import socket
                        from urllib.parse import urlparse
                        p_host = urlparse(t.url if "://" in t.url else f"https://{t.url}").hostname or t.url
                        r_ip = socket.gethostbyname(p_host)
                        latest_resp.resolved_ip = r_ip
                        t.resolved_ip = r_ip
                        latest.resolved_ip = r_ip
                        session.add(t)
                        session.add(latest)
                        need_commit = True
                    except Exception:
                        pass
            t_resp.latest_result = latest_resp
            if not t_resp.resolved_ip:
                t_resp.resolved_ip = latest_resp.resolved_ip
        elif not t_resp.resolved_ip:
            try:
                import socket
                from urllib.parse import urlparse
                p_host = urlparse(t.url if "://" in t.url else f"https://{t.url}").hostname or t.url
                r_ip = socket.gethostbyname(p_host)
                t_resp.resolved_ip = r_ip
                t.resolved_ip = r_ip
                session.add(t)
                need_commit = True
            except Exception:
                pass

        enriched.append(t_resp)

    if need_commit:
        await session.commit()

    return enriched


@router.post("/targets", response_model=WebTargetResponse)
async def create_target(
    req: WebTargetCreate,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    # Check duplicate URL
    stmt = select(WebTarget).where(WebTarget.url == req.url)
    if (await session.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Web target with URL '{req.url}' already exists")

    target = WebTarget(
        user_id=current_user.id,
        name=req.name,
        url=req.url,
        check_interval_seconds=req.check_interval_seconds,
        is_active=req.is_active,
        expected_status_code=req.expected_status_code,
        timeout_seconds=req.timeout_seconds,
    )
    session.add(target)
    await session.commit()
    await session.refresh(target)

    # Immediately perform initial check
    try:
        latest = await WebSentinelService.check_target(session, target)
        t_resp = WebTargetResponse.model_validate(target)
        t_resp.latest_result = WebCheckResultResponse.model_validate(latest)
        return t_resp
    except Exception:
        return WebTargetResponse.model_validate(target)


@router.get("/targets/{target_id}", response_model=WebTargetResponse)
async def get_target(
    target_id: int,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    stmt = select(WebTarget).where(WebTarget.id == target_id)
    target = (await session.execute(stmt)).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Web target not found")

    if current_user.role != UserRole.ADMIN and target.user_id and target.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this web target")

    res_stmt = (
        select(WebCheckResult)
        .where(WebCheckResult.target_id == target.id)
        .order_by(desc(WebCheckResult.timestamp))
        .limit(1)
    )
    latest = (await session.execute(res_stmt)).scalar_one_or_none()

    # Fetch last 10 historical check results
    hist_stmt = (
        select(WebCheckResult)
        .where(WebCheckResult.target_id == target.id)
        .order_by(desc(WebCheckResult.timestamp))
        .limit(10)
    )
    hist_results = (await session.execute(hist_stmt)).scalars().all()

    t_resp = WebTargetResponse.model_validate(target)
    need_commit = False
    if latest:
        latest_resp = WebCheckResultResponse.model_validate(latest)
        if not latest_resp.resolved_ip:
            if target.resolved_ip:
                latest_resp.resolved_ip = target.resolved_ip
            else:
                try:
                    import socket
                    from urllib.parse import urlparse
                    p_host = urlparse(target.url if "://" in target.url else f"https://{target.url}").hostname or target.url
                    r_ip = socket.gethostbyname(p_host)
                    latest_resp.resolved_ip = r_ip
                    target.resolved_ip = r_ip
                    latest.resolved_ip = r_ip
                    session.add(target)
                    session.add(latest)
                    need_commit = True
                except Exception:
                    pass
        t_resp.latest_result = latest_resp
        if not t_resp.resolved_ip:
            t_resp.resolved_ip = latest_resp.resolved_ip

    if hist_results:
        validated_history = []
        for h in hist_results:
            h_resp = WebCheckResultResponse.model_validate(h)
            if not h_resp.resolved_ip and t_resp.resolved_ip:
                h_resp.resolved_ip = t_resp.resolved_ip
            validated_history.append(h_resp)
        t_resp.history = validated_history

    if need_commit:
        await session.commit()

    return t_resp


@router.put("/targets/{target_id}", response_model=WebTargetResponse)
async def update_target(
    target_id: int,
    req: WebTargetUpdate,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    stmt = select(WebTarget).where(WebTarget.id == target_id)
    target = (await session.execute(stmt)).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Web target not found")

    if current_user.role != UserRole.ADMIN and target.user_id and target.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this web target")

    data = req.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(target, k, v)

    session.add(target)
    await session.commit()
    await session.refresh(target)
    return WebTargetResponse.model_validate(target)


@router.delete("/targets/{target_id}")
async def delete_target(
    target_id: int,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    stmt = select(WebTarget).where(WebTarget.id == target_id)
    target = (await session.execute(stmt)).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Web target not found")

    if current_user.role != UserRole.ADMIN and target.user_id and target.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this web target")

    await session.delete(target)
    await session.commit()

    try:
        await AuditService.record_log(
            session=session,
            action="DELETE_WEB_TARGET",
            entity="WEB_TARGET",
            entity_id=target_id,
            username=current_user.username,
            user_id=current_user.id,
            description=f"Web target '{target.name}' ({target.url}) was deleted.",
        )
    except Exception:
        pass

    return {"message": f"Web target '{target.name}' deleted successfully"}


@router.post("/targets/bulk-delete", response_model=SystemActionResponse)
async def bulk_delete_targets(
    req: BulkDeleteIntRequest,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    if not req.ids:
        return SystemActionResponse(success=True, message="No IDs provided", deleted_count=0)

    if current_user.role == UserRole.ADMIN:
        stmt = delete(WebTarget).where(WebTarget.id.in_(req.ids))
    else:
        stmt = delete(WebTarget).where(WebTarget.id.in_(req.ids), WebTarget.user_id == current_user.id)

    res = await session.execute(stmt)
    await session.commit()

    return SystemActionResponse(
        success=True,
        message=f"Successfully deleted {res.rowcount} web targets.",
        deleted_count=res.rowcount,
    )


@router.post("/targets/{target_id}/probe", response_model=WebCheckResultResponse)
async def probe_target(
    target_id: int,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    stmt = select(WebTarget).where(WebTarget.id == target_id)
    target = (await session.execute(stmt)).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Web target not found")

    if current_user.role != UserRole.ADMIN and target.user_id and target.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this web target")

    res = await WebSentinelService.check_target(session, target)
    return WebCheckResultResponse.model_validate(res)


@router.post("/scan", response_model=WebScanResponse)
async def scan_url_live(
    req: WebScanRequest,
    current_user=Depends(get_current_user),
) -> Any:
    """Performs an instant real-world Cyber Security & Health probe on any given URL."""
    report = await WebSentinelService.probe_url(req.url)
    return report
