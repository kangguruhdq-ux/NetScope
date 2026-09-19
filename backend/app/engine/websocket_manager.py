from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Set
from fastapi import WebSocket

logger = logging.getLogger("netscope.websocket")


class WebSocketManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message_type: str, data: dict):
        if not self.active_connections:
            return

        payload = {
            "type": message_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }
        text_payload = json.dumps(payload, default=str)

        # Broadcast to all connected clients safely
        dead_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(text_payload)
            except Exception:
                dead_connections.append(connection)

        if dead_connections:
            async with self._lock:
                for dead in dead_connections:
                    self.active_connections.discard(dead)


ws_manager = WebSocketManager()
