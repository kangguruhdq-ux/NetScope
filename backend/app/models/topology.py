from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Integer, Float, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class LinkType(str, enum.Enum):
    ETHERNET = "ETHERNET"
    FIBER = "FIBER"
    WIRELESS = "WIRELESS"


class TopologyNode(Base):
    __tablename__ = "topology_nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("devices.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    pos_x: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    pos_y: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    label: Mapped[str] = mapped_column(String(128), nullable=False)

    device: Mapped["Device"] = relationship("Device", back_populates="topology_node")


class TopologyConnection(Base):
    __tablename__ = "topology_connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_node_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("topology_nodes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_node_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("topology_nodes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_interface: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    target_interface: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    link_type: Mapped[LinkType] = mapped_column(Enum(LinkType), default=LinkType.ETHERNET, nullable=False)
    link_status: Mapped[str] = mapped_column(String(16), default="UP", nullable=False)


class NetworkEvent(Base):
    __tablename__ = "network_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    old_status: Mapped[str] = mapped_column(String(16), nullable=False)
    new_status: Mapped[str] = mapped_column(String(16), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )
