from __future__ import annotations

from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.device import Device, DeviceType, DeviceStatus, DeviceInterface
from app.schemas.discovery import (
    SubnetScanRequest,
    DiscoveredDeviceResponse,
    BulkAddDevicesRequest,
)
from app.services.discovery_service import DiscoveryService
from app.api.deps import get_current_user, get_current_operator_or_admin

router = APIRouter(prefix="/discovery", tags=["Discovery"])


@router.post("/scan", response_model=List[DiscoveredDeviceResponse])
async def scan_network(
    req: SubnetScanRequest,
    session: AsyncSession = Depends(get_db),
    operator=Depends(get_current_operator_or_admin),
) -> Any:
    try:
        # Get set of all currently monitored IPs
        devices = (await session.execute(select(Device.ip_address))).scalars().all()
        monitored_ips = set(devices)

        discovered = await DiscoveryService.scan_subnet(
            subnet_cidr=req.subnet,
            ports=req.scan_ports,
            timeout_seconds=req.timeout_seconds,
            monitored_ips=monitored_ips,
        )
        return discovered
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid subnet CIDR format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scan error: {str(e)}")


@router.post("/bulk-add")
async def bulk_add_discovered(
    req: BulkAddDevicesRequest,
    session: AsyncSession = Depends(get_db),
    operator=Depends(get_current_operator_or_admin),
) -> Any:
    added_count = 0
    existing_ips = set((await session.execute(select(Device.ip_address))).scalars().all())

    for item in req.devices:
        if item.ip_address in existing_ips:
            continue

        dev_type = DeviceType.OTHER
        if item.suggested_type in DeviceType.__members__:
            dev_type = DeviceType[item.suggested_type]

        protocols = ["ICMP"]
        if 161 in item.open_ports:
            protocols.append("SNMP")
        if any(p in item.open_ports for p in [80, 443]):
            protocols.append("HTTP")

        new_dev = Device(
            name=item.hostname or f"Discovered-{item.ip_address.split('.')[-1]}",
            hostname=item.hostname,
            ip_address=item.ip_address,
            device_type=dev_type,
            location="Discovered Subnet",
            description=f"Auto-discovered host with open ports: {item.open_ports}",
            protocols=protocols,
            tcp_check_ports=item.open_ports,
            status=DeviceStatus.UP if item.is_alive else DeviceStatus.UNKNOWN,
        )
        session.add(new_dev)
        await session.flush()

        primary_if = DeviceInterface(
            device_id=new_dev.id,
            if_index=1,
            name="eth0",
            oper_status="UP",
            speed_bps=1000000000,
        )
        session.add(primary_if)
        existing_ips.add(item.ip_address)
        added_count += 1

    await session.commit()
    return {"message": f"Successfully imported {added_count} devices into monitoring"}
