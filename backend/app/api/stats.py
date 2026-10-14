"""Summary statistics API router."""

from fastapi import APIRouter
from app.core.database import db_engine
from app.models.schemas import StatsSummaryResponse

router = APIRouter(prefix="/api/stats", tags=["Stats"])


@router.get("/summary", response_model=StatsSummaryResponse)
def get_stats_summary() -> StatsSummaryResponse:
    stats = db_engine.get_stats_summary()
    return StatsSummaryResponse(**stats)
