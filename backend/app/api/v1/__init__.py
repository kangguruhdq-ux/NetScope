from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.devices import router as devices_router
from app.api.v1.monitoring import router as monitoring_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.topology import router as topology_router
from app.api.v1.discovery import router as discovery_router
from app.api.v1.troubleshooting import router as troubleshooting_router
from app.api.v1.reports import router as reports_router
from app.api.v1.websocket import router as ws_router
from app.api.v1.system import router as system_router
from app.api.v1.web_sentinel import router as web_sentinel_router
from app.api.v1.diagnostics import router as diagnostics_router
from app.api.v1.security import router as security_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(devices_router)
api_router.include_router(monitoring_router)
api_router.include_router(alerts_router)
api_router.include_router(topology_router)
api_router.include_router(discovery_router)
api_router.include_router(troubleshooting_router)
api_router.include_router(reports_router)
api_router.include_router(ws_router)
api_router.include_router(system_router)
api_router.include_router(web_sentinel_router)
api_router.include_router(diagnostics_router)
api_router.include_router(security_router)
