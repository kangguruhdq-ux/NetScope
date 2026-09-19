from __future__ import annotations

import logging
from datetime import datetime, timezone
from sqlalchemy import select, text
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.device import Device, DeviceType, DeviceStatus, DeviceInterface
from app.models.topology import TopologyNode, TopologyConnection, LinkType
from app.models.audit import SystemSetting
from app.models.web_sentinel import WebTarget

logger = logging.getLogger("netscope.db_init")


async def init_database():
    # 1. Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Safe column migrations for SQLite
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE web_targets ADD COLUMN user_id VARCHAR(36)"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE web_targets ADD COLUMN resolved_ip VARCHAR(64)"))
        except Exception:
            pass
        for col, col_type in [
            ("resolved_ip", "VARCHAR(64)"),
            ("tls_version", "VARCHAR(32)"),
            ("cipher_suite", "VARCHAR(128)"),
            ("http_version", "VARCHAR(32)"),
            ("payload_size_kb", "FLOAT"),
            ("redirect_chain", "JSON"),
            ("raw_headers", "JSON"),
        ]:
            try:
                await conn.execute(text(f"ALTER TABLE web_check_results ADD COLUMN {col} {col_type}"))
            except Exception:
                pass
    logger.info("Database tables initialized successfully.")

    # 2. Seed initial data
    async with AsyncSessionLocal() as session:
        # Check admin user
        admin_stmt = select(User).where(User.username == settings.DEFAULT_ADMIN_USERNAME)
        admin = (await session.execute(admin_stmt)).scalar_one_or_none()

        if not admin:
            admin = User(
                username=settings.DEFAULT_ADMIN_USERNAME,
                email=settings.DEFAULT_ADMIN_EMAIL,
                full_name=settings.DEFAULT_ADMIN_FULLNAME,
                role=UserRole.ADMIN,
                is_active=True,
                password_hash=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
            )
            session.add(admin)
            logger.info(f"Created default admin user: {settings.DEFAULT_ADMIN_USERNAME}")

        # Check default threshold setting
        th_stmt = select(SystemSetting).where(SystemSetting.key == "alert_thresholds")
        if not (await session.execute(th_stmt)).scalar_one_or_none():
            th_setting = SystemSetting(
                key="alert_thresholds",
                value={
                    "consecutive_failures_down": 3,
                    "high_latency_threshold_ms": 100.0,
                    "high_packet_loss_pct": 5.0,
                    "high_cpu_threshold_pct": 85.0,
                    "high_memory_threshold_pct": 85.0,
                },
            )
            session.add(th_setting)

        # Check default devices
        dev_count_stmt = select(Device)
        devices = (await session.execute(dev_count_stmt)).scalars().all()

        if not devices:
            logger.info("Seeding initial institutional network devices and topology...")
            seed_devices = [
                {
                    "name": "Gateway Router Mikrotik CCR2004",
                    "hostname": "gw-core.school.net",
                    "ip_address": "192.168.1.1",
                    "device_type": DeviceType.ROUTER,
                    "location": "Main Server Room - Rack A1",
                    "description": "Border gateway router with BGP uplink & NAT",
                    "protocols": ["ICMP", "SNMP", "TCP"],
                    "snmp_version": "v2c",
                    "snmp_port": 161,
                    "snmp_community": "public",
                    "tcp_check_ports": [8291, 80, 22],
                    "status": DeviceStatus.UP,
                    "pos": (460, 50),
                },
                {
                    "name": "Core Switch Cisco Catalyst 3850",
                    "hostname": "sw-core-01.school.net",
                    "ip_address": "192.168.1.2",
                    "device_type": DeviceType.SWITCH,
                    "location": "Main Server Room - Rack A2",
                    "description": "Layer 3 core 48-port PoE+ distribution switch",
                    "protocols": ["ICMP", "SNMP"],
                    "snmp_version": "v2c",
                    "snmp_port": 161,
                    "snmp_community": "public",
                    "tcp_check_ports": [22, 161],
                    "status": DeviceStatus.UP,
                    "pos": (460, 180),
                },
                {
                    "name": "Distribution Switch D-Link DGS",
                    "hostname": "sw-dist-lab.school.net",
                    "ip_address": "192.168.1.3",
                    "device_type": DeviceType.SWITCH,
                    "location": "Computer Lab 1 - Rack B",
                    "description": "Gigabit distribution switch for student workstations",
                    "protocols": ["ICMP", "SNMP"],
                    "snmp_version": "v2c",
                    "snmp_port": 161,
                    "snmp_community": "public",
                    "tcp_check_ports": [80, 22],
                    "status": DeviceStatus.UP,
                    "pos": (320, 320),
                },
                {
                    "name": "Academic Web & E-Learning Server",
                    "hostname": "moodle-srv.school.net",
                    "ip_address": "192.168.1.20",
                    "device_type": DeviceType.SERVER,
                    "location": "Server Room - Blade 01",
                    "description": "Ubuntu Server 22.04 running Nginx LMS portal",
                    "protocols": ["ICMP", "HTTP", "TCP"],
                    "tcp_check_ports": [80, 443, 22],
                    "http_health_url": "http://192.168.1.20",
                    "status": DeviceStatus.UP,
                    "pos": (780, 180),
                },
                {
                    "name": "Primary DNS & Domain Controller",
                    "hostname": "ad-dc01.school.net",
                    "ip_address": "192.168.1.10",
                    "device_type": DeviceType.SERVER,
                    "location": "Server Room - Blade 02",
                    "description": "Internal DNS authority and user authentication",
                    "protocols": ["ICMP", "TCP"],
                    "tcp_check_ports": [53, 88, 389, 445],
                    "status": DeviceStatus.UP,
                    "pos": (780, 320),
                },
                {
                    "name": "Access Point Hallway Ruijie RG-AP",
                    "hostname": "ap-hallway.school.net",
                    "ip_address": "192.168.1.50",
                    "device_type": DeviceType.ACCESS_POINT,
                    "location": "Building A 2nd Floor Hallway",
                    "description": "Wi-Fi 6 dual-band AP for teachers and staff",
                    "protocols": ["ICMP", "TCP"],
                    "tcp_check_ports": [80, 443],
                    "status": DeviceStatus.UP,
                    "pos": (140, 180),
                },
                {
                    "name": "Access Point Lab Komputer",
                    "hostname": "ap-lab.school.net",
                    "ip_address": "192.168.1.51",
                    "device_type": DeviceType.ACCESS_POINT,
                    "location": "Lab Komputer Multimedia",
                    "description": "High-density Wi-Fi 6 AP",
                    "protocols": ["ICMP"],
                    "status": DeviceStatus.UP,
                    "pos": (100, 320),
                },
                {
                    "name": "Administration Laser Printer",
                    "hostname": "prt-admin.school.net",
                    "ip_address": "192.168.1.100",
                    "device_type": DeviceType.PRINTER,
                    "location": "Administration Office",
                    "description": "Network HP LaserJet Enterprise MFP",
                    "protocols": ["ICMP", "TCP"],
                    "tcp_check_ports": [9100, 80],
                    "status": DeviceStatus.UP,
                    "pos": (520, 320),
                },
            ]

            created_devices = []
            created_nodes = []

            for sdev in seed_devices:
                pos = sdev.pop("pos")
                dev = Device(**sdev)
                session.add(dev)
                await session.flush()

                # Interfaces
                if dev.device_type == DeviceType.ROUTER:
                    iface1 = DeviceInterface(
                        device_id=dev.id,
                        if_index=1,
                        name="ether1-WAN",
                        oper_status="UP",
                        speed_bps=1000000000,
                        curr_in_octets=154820000,
                        curr_out_octets=298400000,
                        rx_bps=45000000,
                        tx_bps=12000000,
                    )
                    iface2 = DeviceInterface(
                        device_id=dev.id,
                        if_index=2,
                        name="ether2-LAN-Trunk",
                        oper_status="UP",
                        speed_bps=10000000000,
                        curr_in_octets=298400000,
                        curr_out_octets=154820000,
                        rx_bps=12000000,
                        tx_bps=45000000,
                    )
                    session.add_all([iface1, iface2])
                else:
                    iface = DeviceInterface(
                        device_id=dev.id,
                        if_index=1,
                        name="eth0",
                        oper_status="UP",
                        speed_bps=1000000000,
                        curr_in_octets=12000000,
                        curr_out_octets=8000000,
                        rx_bps=2500000,
                        tx_bps=1100000,
                    )
                    session.add(iface)

                # Topology Node
                node = TopologyNode(
                    device_id=dev.id,
                    pos_x=float(pos[0]),
                    pos_y=float(pos[1]),
                    label=dev.name,
                )
                session.add(node)
                await session.flush()

                created_devices.append(dev)
                created_nodes.append(node)

            # Topology Connections
            # 0: Gateway Router -> 1: Core Switch (FIBER)
            # 1: Core Switch -> 2: Dist Switch (ETHERNET)
            # 1: Core Switch -> 3: Academic Web Server (ETHERNET)
            # 1: Core Switch -> 4: DNS Server (ETHERNET)
            # 1: Core Switch -> 5: AP Hallway (ETHERNET)
            # 2: Dist Switch -> 6: AP Lab (ETHERNET)
            # 2: Dist Switch -> 7: Admin Printer (ETHERNET)
            conns = [
                TopologyConnection(
                    source_node_id=created_nodes[0].id,
                    target_node_id=created_nodes[1].id,
                    source_interface="ether2-LAN-Trunk",
                    target_interface="TenGi1/1/1",
                    link_type=LinkType.FIBER,
                    link_status="UP",
                ),
                TopologyConnection(
                    source_node_id=created_nodes[1].id,
                    target_node_id=created_nodes[2].id,
                    source_interface="Gi1/0/24",
                    target_interface="port24-uplink",
                    link_type=LinkType.ETHERNET,
                    link_status="UP",
                ),
                TopologyConnection(
                    source_node_id=created_nodes[1].id,
                    target_node_id=created_nodes[3].id,
                    source_interface="Gi1/0/1",
                    target_interface="eth0",
                    link_type=LinkType.ETHERNET,
                    link_status="UP",
                ),
                TopologyConnection(
                    source_node_id=created_nodes[1].id,
                    target_node_id=created_nodes[4].id,
                    source_interface="Gi1/0/2",
                    target_interface="eth0",
                    link_type=LinkType.ETHERNET,
                    link_status="UP",
                ),
                TopologyConnection(
                    source_node_id=created_nodes[1].id,
                    target_node_id=created_nodes[5].id,
                    source_interface="Gi1/0/10",
                    target_interface="eth0-poe",
                    link_type=LinkType.WIRELESS,
                    link_status="UP",
                ),
                TopologyConnection(
                    source_node_id=created_nodes[2].id,
                    target_node_id=created_nodes[6].id,
                    source_interface="port10-poe",
                    target_interface="eth0",
                    link_type=LinkType.WIRELESS,
                    link_status="UP",
                ),
                TopologyConnection(
                    source_node_id=created_nodes[2].id,
                    target_node_id=created_nodes[7].id,
                    source_interface="port15",
                    target_interface="eth0",
                    link_type=LinkType.ETHERNET,
                    link_status="UP",
                ),
            ]
            session.add_all(conns)

        # Check default web targets
        web_stmt = select(WebTarget)
        web_targets = (await session.execute(web_stmt)).scalars().all()
        if not web_targets:
            logger.info("Seeding initial Web Sentinel monitoring targets...")
            session.add_all([
                WebTarget(
                    name="NetScope Core Local Service",
                    url="http://127.0.0.1:8000/health",
                    check_interval_seconds=30,
                    is_active=True,
                    expected_status_code=200,
                    timeout_seconds=3.0,
                ),
                WebTarget(
                    name="Google Public Web & DNS",
                    url="https://dns.google",
                    check_interval_seconds=60,
                    is_active=True,
                    expected_status_code=200,
                    timeout_seconds=5.0,
                ),
            ])

        # Check default config backups
        from app.models.config_backup import ConfigBackup
        backup_stmt = select(ConfigBackup)
        backups = (await session.execute(backup_stmt)).scalars().all()
        if not backups:
            sample_cfg_v1 = (
                "# RouterOS 7.14 configuration export\n"
                "# Model: CCR2004-16G-2S+\n"
                "/interface bridge\n"
                "add name=bridge-lan protocol-mode=rstp\n"
                "/interface ethernet\n"
                "set [ find default-name=ether1 ] comment=WAN-ISP1 name=ether1-gateway\n"
                "set [ find default-name=ether2 ] comment=LAN-Core name=ether2-lan\n"
                "/ip address\n"
                "add address=192.168.1.1/24 interface=bridge-lan network=192.168.1.0\n"
                "/ip firewall filter\n"
                "add action=accept chain=input connection-state=established,related\n"
                "add action=drop chain=input connection-state=invalid\n"
            )
            sample_cfg_v2 = (
                "# RouterOS 7.14 configuration export\n"
                "# Model: CCR2004-16G-2S+\n"
                "/interface bridge\n"
                "add name=bridge-lan protocol-mode=rstp\n"
                "/interface ethernet\n"
                "set [ find default-name=ether1 ] comment=WAN-ISP1 name=ether1-gateway\n"
                "set [ find default-name=ether2 ] comment=LAN-Core name=ether2-lan\n"
                "set [ find default-name=sfp-plus1 ] comment=Uplink-10G-Switch name=sfp1-trunk\n"
                "/ip address\n"
                "add address=192.168.1.1/24 interface=bridge-lan network=192.168.1.0\n"
                "add address=10.0.10.1/24 interface=sfp1-trunk network=10.0.10.0\n"
                "/ip firewall filter\n"
                "add action=accept chain=input connection-state=established,related\n"
                "add action=accept chain=input dst-port=22 protocol=tcp src-address=192.168.1.0/24\n"
                "add action=drop chain=input connection-state=invalid\n"
                "add action=drop chain=input in-interface=ether1-gateway\n"
            )
            session.add_all([
                ConfigBackup(
                    backup_name="CCR2004-Baseline-v1.0.rsc",
                    device_name="Gateway Router CCR2004",
                    config_content=sample_cfg_v1,
                    file_size_bytes=len(sample_cfg_v1.encode("utf-8")),
                    description="Initial baseline production configuration.",
                    created_by="admin",
                ),
                ConfigBackup(
                    backup_name="CCR2004-Hardened-v1.1.rsc",
                    device_name="Gateway Router CCR2004",
                    config_content=sample_cfg_v2,
                    file_size_bytes=len(sample_cfg_v2.encode("utf-8")),
                    description="Added 10G SFP+ uplink trunk and firewall drop rules.",
                    created_by="admin",
                )
            ])

        # Check default audit logs
        from app.models.audit import AuditLog
        audit_count = (await session.execute(select(AuditLog))).scalars().first()
        if not audit_count:
            now = datetime.now(timezone.utc)
            session.add_all([
                AuditLog(
                    username="admin",
                    action="SYSTEM_INIT",
                    entity="SYSTEM",
                    description="NetScope platform database and dual-engine monitoring engine initialized.",
                    ip_address="127.0.0.1",
                    created_at=now,
                ),
                AuditLog(
                    username="admin",
                    action="SEED_TOPOLOGY",
                    entity="TOPOLOGY",
                    description="Institutional network topology nodes and active links initialized.",
                    ip_address="127.0.0.1",
                    created_at=now,
                ),
                AuditLog(
                    username="admin",
                    action="AUTH_LOGIN",
                    entity="USER",
                    description="Super Administrator logged in to NOC Operations Center.",
                    ip_address="192.168.1.100",
                    created_at=now,
                ),
            ])

        await session.commit()
        logger.info("Database initialization and initial seeding complete.")
