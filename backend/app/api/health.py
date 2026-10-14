"""Health check API endpoints."""

from fastapi import APIRouter
from app.core import config
from app.core.database import db_engine
from app.models.schemas import DatabaseHealth, HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
@router.get("/api/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    total_cells = db_engine.get_total_cells()
    return HealthResponse(
        status="ok",
        service="JEJAK API",
        version="0.1.0",
        database=DatabaseHealth(
            engine="DuckDB",
            parquet_path=str(config.DATA_PARQUET_PATH),
            total_cells=total_cells,
        ),
    )
