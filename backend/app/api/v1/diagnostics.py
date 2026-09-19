from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.diagnostics import (
    TracerouteRequest,
    TracerouteReport,
    DNSBenchmarkRequest,
    DNSBenchmarkReport,
    SpeedtestRequest,
    SpeedtestReport,
    InterfaceStatsReport,
)
from app.services.diagnostics_service import diagnostics_service

router = APIRouter(prefix="/diagnostics", tags=["Cyber Diagnostics"])


@router.post("/traceroute", response_model=TracerouteReport)
async def run_visual_traceroute(
    req: TracerouteRequest,
    current_user: User = Depends(get_current_user),
):
    """Executes a real hop-by-hop traceroute to target hostname or IP address."""
    if not req.target or len(req.target.strip()) < 2:
        raise HTTPException(status_code=400, detail="Invalid target address specified.")
    return await diagnostics_service.run_traceroute(
        target=req.target,
        max_hops=req.max_hops,
        timeout_seconds=req.timeout_seconds,
    )


@router.post("/dns-benchmark", response_model=DNSBenchmarkReport)
async def run_dns_benchmark(
    req: DNSBenchmarkRequest,
    current_user: User = Depends(get_current_user),
):
    """Benchmarks DNS resolution speed and audits anti-spoofing across multiple public resolvers."""
    if not req.domain or len(req.domain.strip()) < 2:
        raise HTTPException(status_code=400, detail="Invalid domain specified.")
    return await diagnostics_service.benchmark_dns(
        domain=req.domain,
        record_types=req.record_types,
    )


@router.post("/speedtest", response_model=SpeedtestReport)
async def run_speedtest_benchmark(
    req: Optional[SpeedtestRequest] = None,
    current_user: User = Depends(get_current_user),
):
    """Performs an ISP throughput speedtest and jitter/latency measurement."""
    sample_size = req.sample_size_mb if req else 5
    return await diagnostics_service.run_speedtest(
        sample_size_mb=sample_size,
    )


@router.get("/interface-stats", response_model=InterfaceStatsReport)
async def get_interface_storm_stats(
    current_user: User = Depends(get_current_user),
):
    """Retrieves physical host network interface telemetry and broadcast storm alert status."""
    return await diagnostics_service.get_interface_stats()
