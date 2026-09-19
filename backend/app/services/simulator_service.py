from __future__ import annotations

import math
import random
import time
from typing import Dict, Any, Tuple


class SimulatorService:
    """
    Realistic Network Telemetry Simulator used when DEMO_MODE=true.
    Generates time-dependent dynamic network curves (diurnal traffic, jitter,
    octet counter growth) without static flat numbers.
    """

    @classmethod
    def generate_device_telemetry(cls, device_id: int, device_type: str, ip_address: str) -> Dict[str, Any]:
        t = time.time()
        # Diurnal base wave (simulating school/office traffic peak and trough)
        wave = (math.sin(t / 60.0) + 1.0) / 2.0  # 0.0 to 1.0
        fast_wave = (math.sin(t / 15.0 + device_id) + 1.0) / 2.0

        # Base parameters depending on device role
        if "ROUTER" in device_type:
            base_latency = 4.0 + fast_wave * 5.0 + random.uniform(-1.0, 1.5)
            rx_rate = (15_000_000 + wave * 60_000_000) + random.uniform(0, 5_000_000)
            tx_rate = (8_000_000 + wave * 30_000_000) + random.uniform(0, 3_000_000)
            cpu = 25.0 + wave * 35.0 + random.uniform(-2, 4)
            mem = 48.0 + random.uniform(-1, 2)
        elif "SWITCH" in device_type:
            base_latency = 1.2 + fast_wave * 1.5 + random.uniform(-0.3, 0.4)
            rx_rate = (20_000_000 + wave * 90_000_000) + random.uniform(0, 8_000_000)
            tx_rate = (20_000_000 + wave * 85_000_000) + random.uniform(0, 7_000_000)
            cpu = 15.0 + wave * 18.0 + random.uniform(-1, 2)
            mem = 35.0 + random.uniform(-0.5, 1.5)
        elif "SERVER" in device_type:
            base_latency = 2.0 + fast_wave * 2.5 + random.uniform(-0.5, 0.8)
            rx_rate = (10_000_000 + wave * 45_000_000) + random.uniform(0, 4_000_000)
            tx_rate = (30_000_000 + wave * 110_000_000) + random.uniform(0, 10_000_000)
            cpu = 30.0 + wave * 45.0 + random.uniform(-3, 5)
            mem = 65.0 + random.uniform(-2, 3)
        else:
            base_latency = 8.0 + fast_wave * 12.0 + random.uniform(-2.0, 3.0)
            rx_rate = (2_000_000 + wave * 10_000_000) + random.uniform(0, 1_000_000)
            tx_rate = (1_000_000 + wave * 5_000_000) + random.uniform(0, 500_000)
            cpu = 10.0 + wave * 20.0 + random.uniform(-1, 2)
            mem = 40.0 + random.uniform(-1, 2)

        # Minor realistic packet loss jitter (rarely > 0)
        packet_loss = 0.0
        if random.random() < 0.05:  # 5% chance of minor jitter loss
            packet_loss = round(random.uniform(0.5, 2.5), 1)

        return {
            "is_alive": True,
            "latency_ms": max(0.2, round(base_latency, 2)),
            "packet_loss_pct": packet_loss,
            "cpu_usage_pct": round(min(98.0, max(5.0, cpu)), 1),
            "memory_usage_pct": round(min(98.0, max(10.0, mem)), 1),
            "rx_bps": round(rx_rate, 1),
            "tx_bps": round(tx_rate, 1),
        }
