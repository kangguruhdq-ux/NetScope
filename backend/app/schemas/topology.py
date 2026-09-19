from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel
from app.models.topology import LinkType


class TopologyNodeResponse(BaseModel):
    id: int
    device_id: int
    pos_x: float
    pos_y: float
    label: str
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    ip_address: Optional[str] = None
    status: Optional[str] = "UNKNOWN"

    class Config:
        from_attributes = True


class TopologyConnectionResponse(BaseModel):
    id: int
    source_node_id: int
    target_node_id: int
    source_interface: Optional[str] = None
    target_interface: Optional[str] = None
    link_type: LinkType = LinkType.ETHERNET
    link_status: str = "UP"

    class Config:
        from_attributes = True


class NodePositionUpdate(BaseModel):
    id: int
    pos_x: float
    pos_y: float


class ConnectionCreateRequest(BaseModel):
    source_node_id: int
    target_node_id: int
    source_interface: Optional[str] = None
    target_interface: Optional[str] = None
    link_type: LinkType = LinkType.ETHERNET


class TopologySaveLayoutRequest(BaseModel):
    nodes: List[NodePositionUpdate]


class TopologyGraphResponse(BaseModel):
    nodes: List[TopologyNodeResponse]
    connections: List[TopologyConnectionResponse]
