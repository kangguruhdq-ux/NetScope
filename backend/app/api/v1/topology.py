from __future__ import annotations

import math
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.device import Device
from app.models.topology import TopologyNode, TopologyConnection, LinkType
from app.schemas.topology import (
    TopologyNodeResponse,
    TopologyConnectionResponse,
    TopologyGraphResponse,
    TopologySaveLayoutRequest,
    ConnectionCreateRequest,
)
from app.api.deps import get_current_user, get_current_operator_or_admin
from app.services.audit_service import AuditService

router = APIRouter(prefix="/topology", tags=["Topology"])


@router.get("", response_model=TopologyGraphResponse)
async def get_topology(
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Any:
    # 1. Sync nodes: check if any device lacks a TopologyNode
    devices = (await session.execute(select(Device))).scalars().all()
    existing_nodes = (await session.execute(select(TopologyNode))).scalars().all()
    node_dev_ids = {n.device_id for n in existing_nodes}

    # Auto-position new nodes in a circular or grid pattern
    center_x, center_y = 500.0, 320.0
    radius = 240.0
    missing = [d for d in devices if d.id not in node_dev_ids]

    if missing:
        total_missing = len(missing)
        for i, dev in enumerate(missing):
            angle = (2 * math.pi / max(1, total_missing)) * i
            px = center_x + radius * math.cos(angle)
            py = center_y + radius * math.sin(angle)
            node = TopologyNode(
                device_id=dev.id,
                pos_x=round(px, 1),
                pos_y=round(py, 1),
                label=dev.name,
            )
            session.add(node)
        await session.commit()
        existing_nodes = (await session.execute(select(TopologyNode))).scalars().all()

    # Build node responses
    dev_map = {d.id: d for d in devices}
    node_responses: List[TopologyNodeResponse] = []
    for n in existing_nodes:
        d = dev_map.get(n.device_id)
        node_responses.append(TopologyNodeResponse(
            id=n.id,
            device_id=n.device_id,
            pos_x=n.pos_x,
            pos_y=n.pos_y,
            label=n.label,
            device_name=d.name if d else n.label,
            device_type=d.device_type.value if d else "OTHER",
            ip_address=d.ip_address if d else "0.0.0.0",
            status=d.status.value if d else "UNKNOWN",
        ))

    # Connections
    conn_stmt = select(TopologyConnection)
    conns = (await session.execute(conn_stmt)).scalars().all()
    conn_responses = [TopologyConnectionResponse.model_validate(c) for c in conns]

    return TopologyGraphResponse(nodes=node_responses, connections=conn_responses)


@router.post("/save-layout")
async def save_topology_layout(
    req: TopologySaveLayoutRequest,
    session: AsyncSession = Depends(get_db),
    operator=Depends(get_current_operator_or_admin),
) -> Any:
    for item in req.nodes:
        stmt = select(TopologyNode).where(TopologyNode.id == item.id)
        node = (await session.execute(stmt)).scalar_one_or_none()
        if node:
            node.pos_x = item.pos_x
            node.pos_y = item.pos_y
            session.add(node)

    await session.commit()
    return {"message": "Topology layout saved successfully"}


@router.post("/connections", response_model=TopologyConnectionResponse)
async def create_connection(
    req: ConnectionCreateRequest,
    session: AsyncSession = Depends(get_db),
    operator=Depends(get_current_operator_or_admin),
) -> Any:
    conn = TopologyConnection(
        source_node_id=req.source_node_id,
        target_node_id=req.target_node_id,
        source_interface=req.source_interface,
        target_interface=req.target_interface,
        link_type=req.link_type,
        link_status="UP",
    )
    session.add(conn)
    await session.commit()
    await session.refresh(conn)
    return conn


@router.delete("/connections/{conn_id}")
async def delete_connection(
    conn_id: int,
    session: AsyncSession = Depends(get_db),
    operator=Depends(get_current_operator_or_admin),
) -> Any:
    stmt = select(TopologyConnection).where(TopologyConnection.id == conn_id)
    conn = (await session.execute(stmt)).scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    await session.delete(conn)
    await session.commit()

    try:
        await AuditService.record_log(
            session=session,
            action="DELETE_LINK",
            entity="TOPOLOGY_LINK",
            entity_id=conn_id,
            username=operator.username,
            user_id=operator.id,
            description=f"Topology link #{conn_id} ({conn.link_type}) was removed by {operator.username}.",
        )
    except Exception:
        pass

    return {"message": "Connection removed"}
