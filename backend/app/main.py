"""JEJAK API - Peatland Fire Risk Intelligence Platform.

Hackathon JOINTS UGM 2026 (Sustainability Subtheme)
Pilot: Kabupaten Ogan Komering Ilir (OKI), Sumatera Selatan
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    import sentry_sdk
    SENTRY_DSN = os.getenv("SENTRY_DSN")
    if SENTRY_DSN:
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            send_default_pii=True,
            traces_sample_rate=1.0,
        )
except ImportError:
    pass

from app.api import alerts, cells, drone, health, live, model, patrol, stats
from app.core import config
from app.core.database import db_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure DuckDB view over Parquet dataset is initialized
    _ = db_engine.conn
    yield
    # Shutdown: close DuckDB engine
    db_engine.close()


app = FastAPI(
    title="JEJAK API",
    description="JEJAK API: WebGIS Peringatan Dini Kebakaran Gambut H-30 Berbasis Jejak Aktivitas Manusia Menggunakan LightGBM dan Explainable AI (TreeSHAP) dengan Verifikasi Lapangan Melalui Drone Langsung",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration - Allow all origins for seamless API access across VPS / localhost / subdomains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(patrol.router)
app.include_router(cells.router)
app.include_router(stats.router)
app.include_router(alerts.router)
app.include_router(model.router)
app.include_router(drone.router)
app.include_router(live.router)



@app.get("/sentry-debug")
async def trigger_sentry_error():
    """Trigger a test error to verify Sentry backend telemetry."""
    division_by_zero = 1 / 0
    return {"result": division_by_zero}


@app.get("/")
def root():
    return {
        "message": "Welcome to JEJAK API - Peatland Fire Risk Intelligence Platform",
        "pilot_region": "Kabupaten Ogan Komering Ilir (OKI), Sumatera Selatan",
        "docs_url": "/docs",
        "health_url": "/api/health",
    }

