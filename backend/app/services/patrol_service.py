"""Patrol priority ranking service (Feature F2)."""

from __future__ import annotations

import io
from typing import Optional

import pandas as pd

from app.core.database import db_engine
from app.models.schemas import CellSummary, PatrolTopKResponse


def get_top_k_patrol(
    k: int = 10,
    khg_id: Optional[str] = None,
    risk_category: Optional[str] = None,
    max_access_distance_m: Optional[float] = None,
    sort_by: str = "risk_score",
) -> PatrolTopKResponse:
    total_cells = db_engine.get_total_cells()
    raw_results = db_engine.get_top_k(
        k=k,
        khg_id=khg_id,
        risk_category=risk_category,
        max_access_distance_m=max_access_distance_m,
        sort_by=sort_by,
    )
    summaries = [CellSummary(**r) for r in raw_results]
    return PatrolTopKResponse(k=len(summaries), total_cells=total_cells, results=summaries)


def generate_patrol_csv(
    k: int = 10,
    khg_id: Optional[str] = None,
    risk_category: Optional[str] = None,
    max_access_distance_m: Optional[float] = None,
    sort_by: str = "risk_score",
) -> str:
    raw_results = db_engine.get_top_k(
        k=k,
        khg_id=khg_id,
        risk_category=risk_category,
        max_access_distance_m=max_access_distance_m,
        sort_by=sort_by,
    )
    df = pd.DataFrame(raw_results)
    if df.empty:
        return "cell_id,risk_score,risk_score_calibrated,risk_category,khg_id,lon,lat,distance_to_road_m,distance_to_waterway_m,access_distance_m\n"

    # Export cleanly formatted CSV with access attributes
    export_cols = [
        "cell_id",
        "risk_score",
        "risk_score_calibrated",
        "risk_category",
        "khg_id",
        "lon",
        "lat",
        "distance_to_road_m",
        "distance_to_waterway_m",
        "access_distance_m",
    ]
    available_cols = [c for c in export_cols if c in df.columns]
    buffer = io.StringIO()
    df[available_cols].to_csv(buffer, index=False)
    return buffer.getvalue()
