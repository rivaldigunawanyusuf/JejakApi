"""Cell inspection and local TreeSHAP explanation service (Feature F1)."""

from __future__ import annotations

from typing import Optional

from app.core.database import db_engine
from app.models.schemas import CellRiskResponse, RiskFeatureContribution


def inspect_cell(cell_id: str) -> Optional[CellRiskResponse]:
    record = db_engine.get_cell_by_id(cell_id)
    if not record:
        return None

    top_factors_raw = record.get("top_factors", [])
    top_factors = [RiskFeatureContribution(**f) for f in top_factors_raw]

    # Ensure exactly 3 factors
    while len(top_factors) < 3:
        top_factors.append(
            RiskFeatureContribution(
                feature_name="baseline",
                contribution_score=0.0,
                narrative="Faktor risiko dalam ambang batas normal.",
            )
        )
    top_factors = top_factors[:3]

    return CellRiskResponse(
        cell_id=record["cell_id"],
        risk_score=float(record["risk_score"]),
        risk_category=str(record["risk_category"]),
        khg_id=str(record["khg_id"]),
        lon=float(record["lon"]),
        lat=float(record["lat"]),
        canal_density_km_km2=float(record["canal_density_km_km2"]),
        distance_to_road_m=float(record["distance_to_road_m"]),
        distance_to_waterway_m=float(record["distance_to_waterway_m"]),
        temp_c=float(record.get("temp_c") or 0.0),
        rh_pct=float(record.get("rh_pct") or 0.0),
        dc=float(record.get("dc") or 0.0),
        dmc=float(record.get("dmc") or 0.0),
        rain_deficit_30d=float(record.get("rain_deficit_30d") or 0.0),
        clearing_w0_30=float(record.get("clearing_w0_30") or 0.0),
        clearing_w30_90=float(record.get("clearing_w30_90") or 0.0),
        clearing_w90_365=float(record.get("clearing_w90_365") or 0.0),
        fire_history_w0_30=float(record.get("fire_history_w0_30") or 0.0),
        top_factors=top_factors,
    )
