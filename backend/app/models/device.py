from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import List, Optional, Any
from sqlalchemy import (
    String,
    Integer,
    BigInteger,
    Float,
    Boolean,
    Text,
    DateTime,
    Enum,
    JSON,
    ForeignKey,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class DeviceType(str, enum.Enum):
    ROUTER = "ROUTER"
    SWITCH = "SWITCH"
    ACCESS_POINT = "ACCESS_POINT"
    SERVER = "SERVER"
    PC = "PC"
    PRINTER = "PRINTER"
    FIREWALL = "FIREWALL"
    OTHER = "OTHER"


class DeviceStatus(str, enum.Enum):
    UP = "UP"
    DEGRADED = "DEGRADED"
    DOWN = "DOWN"
    MAINTENANCE = "MAINTENANCE"
    UNKNOWN = "UNKNOWN"


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    hostname: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    ip_address: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    device_type: Mapped[DeviceType] = mapped_column(
        Enum(DeviceType), default=DeviceType.OTHER, nullable=False
    )
    location: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_monitored: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    monitoring_interval_seconds: Mapped[int] = mapped_column(Integer, default=30, nullable=False)

    # Protocols enabled: ["ICMP", "SNMP", "TCP", "HTTP"]
    protocols: Mapped[List[str]] = mapped_column(JSON, default=lambda: ["ICMP"], nullable=False)

    # SNMP Settings
    snmp_version: Mapped[str] = mapped_column(String(10), default="v2c", nullable=False)
    snmp_port: Mapped[int] = mapped_column(Integer, default=161, nullable=False)
    snmp_community: Mapped[str] = mapped_column(String(64), default="public", nullable=False)
    snmp_username: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    snmp_auth_protocol: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    snmp_auth_password: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    snmp_priv_protocol: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    snmp_priv_password: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    # TCP / HTTP Checks
    tcp_check_ports: Mapped[List[int]] = mapped_column(JSON, default=list, nullable=False)
    http_health_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Current Real-Time Status & Metrics
    status: Mapped[DeviceStatus] = mapped_column(
        Enum(DeviceStatus), default=DeviceStatus.UNKNOWN, nullable=False
    )
    uptime_seconds: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_seen: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    interfaces: Mapped[List["DeviceInterface"]] = relationship(
        "DeviceInterface", back_populates="device", cascade="all, delete-orphan", lazy="selectin"
    )
    samples: Mapped[List["MonitoringSample"]] = relationship(
        "MonitoringSample", back_populates="device", cascade="all, delete-orphan", lazy="noload"
    )
    alerts: Mapped[List["Alert"]] = relationship(
        "Alert", back_populates="device", cascade="all, delete-orphan", lazy="noload"
    )
    topology_node: Mapped[Optional["TopologyNode"]] = relationship(
        "TopologyNode", back_populates="device", uselist=False, cascade="all, delete-orphan"
    )


class DeviceInterface(Base):
    __tablename__ = "device_interfaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    if_index: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    mac_address: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    oper_status: Mapped[str] = mapped_column(String(16), default="UP", nullable=False)
    speed_bps: Mapped[int] = mapped_column(BigInteger, default=1000000000, nullable=False)  # 1 Gbps default

    prev_in_octets: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    curr_in_octets: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    prev_out_octets: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    curr_out_octets: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    rx_bps: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tx_bps: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    errors_in: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    errors_out: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    device: Mapped["Device"] = relationship("Device", back_populates="interfaces")
