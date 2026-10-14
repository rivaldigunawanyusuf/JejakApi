"""Patrol Priority Ranking (Top-k) API endpoints (Feature F2)."""

from typing import Optional
from fastapi import APIRouter, Query, Response
from app.models.schemas import PatrolTopKResponse
from app.services import patrol_service

router = APIRouter(prefix="/api/patrol", tags=["Patrol"])


@router.get("/top-k", response_model=PatrolTopKResponse)
def get_patrol_top_k(
    k: int = Query(default=10, ge=1, le=100, description="Number of priority cells to retrieve (e.g. 11-16 Daops crews)"),
    khg_id: Optional[str] = Query(default=None, description="Optional KHG identifier filter"),
    risk_category: Optional[str] = Query(default=None, description="Optional risk category (Bahaya, Siaga, Waspada)"),
    max_access_distance_m: Optional[float] = Query(default=None, ge=0, description="Maximum access distance in meters (road/waterway)"),
    sort_by: str = Query(default="risk_score", pattern="^(risk_score|risk_score_calibrated|access_distance_m|accessibility)$", description="Ranking attribute"),
) -> PatrolTopKResponse:
    normalized_sort_by = "access_distance_m" if sort_by == "accessibility" else sort_by
    return patrol_service.get_top_k_patrol(
        k=k,
        khg_id=khg_id,
        risk_category=risk_category,
        max_access_distance_m=max_access_distance_m,
        sort_by=normalized_sort_by,
    )


@router.get("/top-k/export")
def export_patrol_top_k_csv(
    k: int = Query(default=10, ge=1, le=100, description="Number of priority cells to export"),
    khg_id: Optional[str] = Query(default=None, description="Optional KHG identifier filter"),
    risk_category: Optional[str] = Query(default=None, description="Optional risk category (Bahaya, Siaga, Waspada)"),
    max_access_distance_m: Optional[float] = Query(default=None, ge=0, description="Maximum access distance in meters (road/waterway)"),
    sort_by: str = Query(default="risk_score", pattern="^(risk_score|risk_score_calibrated|access_distance_m|accessibility)$"),
) -> Response:
    normalized_sort_by = "access_distance_m" if sort_by == "accessibility" else sort_by
    csv_content = patrol_service.generate_patrol_csv(
        k=k,
        khg_id=khg_id,
        risk_category=risk_category,
        max_access_distance_m=max_access_distance_m,
        sort_by=normalized_sort_by,
    )
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=oki_patrol_top_k.csv"},
    )
