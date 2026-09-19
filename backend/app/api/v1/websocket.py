from __future__ import annotations

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from app.core.security import decode_token
from app.engine.websocket_manager import ws_manager

logger = logging.getLogger("netscope.websocket_api")

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token"),
):
    # Safeguard 3: Authenticate via query param
    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        logger.warning("Rejected unauthenticated WebSocket connection attempt.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection open and accept client heartbeats / ping
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        await ws_manager.disconnect(websocket)
