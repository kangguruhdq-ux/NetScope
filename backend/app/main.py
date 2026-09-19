from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import api_router
from app.db_init import init_database
from app.engine.scheduler import scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("netscope.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing NetScope Platform...")
    await init_database()
    scheduler.start()
    logger.info(f"NetScope operational. Mode: {'DEMO SIMULATOR' if settings.DEMO_MODE else 'LIVE PRODUCTION'}")
    yield
    # Shutdown
    logger.info("Shutting down NetScope Platform...")
    scheduler.stop()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.TAGLINE,
    version=settings.VERSION,
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount static uploads for user profile pictures and files
from pathlib import Path
from fastapi.staticfiles import StaticFiles

uploads_dir = Path(__file__).resolve().parent.parent / "static" / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
(uploads_dir / "avatars").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "demo_mode": settings.DEMO_MODE,
    }
