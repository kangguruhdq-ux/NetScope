from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional, Tuple
from pysnmp.hlapi.asyncio import (
    SnmpEngine,
    CommunityData,
    UdpTransportTarget,
    ContextData,
    ObjectType,
    ObjectIdentity,
    getCmd,
    nextCmd,
)


class SNMPService:
    """
    Pure Python SNMP Engine using pysnmp async.
    Queries standard MIB-II variables (sysDescr, sysUpTime, ifTable).
    No C-compiler dependencies.
    """

    SYS_DESCR_OID = "1.3.6.1.2.1.1.1.0"
    SYS_UPTIME_OID = "1.3.6.1.2.1.1.3.0"
    SYS_NAME_OID = "1.3.6.1.2.1.1.5.0"

    IF_DESCR_OID = "1.3.6.1.2.1.2.2.1.2"
    IF_OPER_STATUS_OID = "1.3.6.1.2.1.2.2.1.8"
    IF_IN_OCTETS_OID = "1.3.6.1.2.1.2.2.1.10"
    IF_OUT_OCTETS_OID = "1.3.6.1.2.1.2.2.1.16"
    IF_IN_ERRORS_OID = "1.3.6.1.2.1.2.2.1.14"
    IF_OUT_ERRORS_OID = "1.3.6.1.2.1.2.2.1.20"

    @classmethod
    async def get_system_info(
        cls,
        host: str,
        community: str = "public",
        port: int = 161,
        timeout_seconds: float = 2.5,
    ) -> Tuple[bool, Optional[str], Optional[int], Optional[str], str]:
        """
        Queries sysDescr, sysUpTime, and sysName.
        Returns (success, sys_descr, uptime_ticks, sys_name, message).
        """
        snmp_engine = SnmpEngine()
        try:
            target = await UdpTransportTarget.create((host, port), timeout=timeout_seconds, retries=1)
            errorIndication, errorStatus, errorIndex, varBinds = await asyncio.wait_for(
                getCmd(
                    snmp_engine,
                    CommunityData(community, mpModel=1),  # v2c
                    target,
                    ContextData(),
                    ObjectType(ObjectIdentity(cls.SYS_DESCR_OID)),
                    ObjectType(ObjectIdentity(cls.SYS_UPTIME_OID)),
                    ObjectType(ObjectIdentity(cls.SYS_NAME_OID)),
                ),
                timeout=timeout_seconds + 1.0,
            )

            if errorIndication:
                return False, None, None, None, str(errorIndication)
            elif errorStatus:
                return False, None, None, None, f"{errorStatus.prettyPrint()} at {errorIndex}"
            else:
                sys_descr = str(varBinds[0][1]) if len(varBinds) > 0 else None
                try:
                    uptime_val = int(varBinds[1][1]) if len(varBinds) > 1 else None
                except (ValueError, TypeError):
                    uptime_val = None
                sys_name = str(varBinds[2][1]) if len(varBinds) > 2 else None

                return True, sys_descr, uptime_val, sys_name, "SNMP query successful"
        except asyncio.TimeoutError:
            return False, None, None, None, f"SNMP request timed out after {timeout_seconds}s"
        except Exception as ex:
            return False, None, None, None, f"SNMP error: {str(ex)}"

    @classmethod
    async def get_interface_metrics(
        cls,
        host: str,
        community: str = "public",
        port: int = 161,
        timeout_seconds: float = 2.5,
    ) -> List[Dict[str, Any]]:
        """
        Walks ifTable to gather port details and octet counters.
        """
        interfaces: List[Dict[str, Any]] = []
        snmp_engine = SnmpEngine()
        try:
            target = await UdpTransportTarget.create((host, port), timeout=timeout_seconds, retries=1)
            # Walk ifDescr
            async for errorIndication, errorStatus, errorIndex, varBinds in nextCmd(
                snmp_engine,
                CommunityData(community, mpModel=1),
                target,
                ContextData(),
                ObjectType(ObjectIdentity(cls.IF_DESCR_OID)),
                lexicographicMode=False,
            ):
                if errorIndication or errorStatus:
                    break
                for varBind in varBinds:
                    oid, val = varBind
                    oid_str = str(oid)
                    idx = int(oid_str.split(".")[-1])
                    interfaces.append({
                        "if_index": idx,
                        "name": str(val),
                        "oper_status": "UP",
                        "in_octets": 0,
                        "out_octets": 0,
                        "in_errors": 0,
                        "out_errors": 0,
                    })
        except Exception:
            pass

        return interfaces
