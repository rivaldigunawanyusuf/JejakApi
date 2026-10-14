import re
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, Path, Query
from app.models.schemas import CellRiskResponse
from app.services import cell_service
from app.core.database import db_engine

router = APIRouter(prefix="/api/cells", tags=["Cells"])


@router.get("/search")
def search_cells(
    q: str = Query(..., description="Cell ID, partial code, coordinates (lat, lon), or region keyword"),
) -> Dict[str, Any]:
    """Search for a grid cell by cell ID, coordinates, or partial pattern."""
    q_clean = q.strip()

    # 1. Check coordinates (e.g. -2.57, 105.27 or 105.27, -2.57)
    coord_match = re.match(r"^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$", q_clean)
    if coord_match:
        v1 = float(coord_match.group(1))
        v2 = float(coord_match.group(2))
        if 95.0 <= v1 <= 142.0:
            lon, lat = v1, v2
        elif 95.0 <= v2 <= 142.0:
            lat, lon = v1, v2
        else:
            lat, lon = v1, v2

        nearest = db_engine.find_nearest_cell(lat, lon)
        if nearest:
            return {
                "found": True,
                "type": "coordinate",
                "cell_id": nearest["cell_id"],
                "lon": float(nearest["lon"]),
                "lat": float(nearest["lat"]),
                "risk_score": float(nearest["risk_score"]),
                "risk_category": str(nearest["risk_category"]),
                "khg_id": str(nearest["khg_id"]),
            }

    # 2. Check Cell ID / Pattern
    cell = cell_service.inspect_cell(q_clean)
    if cell:
        return {
            "found": True,
            "type": "cell",
            "cell_id": cell.cell_id,
            "lon": float(cell.lon),
            "lat": float(cell.lat),
            "risk_score": float(cell.risk_score),
            "risk_category": str(cell.risk_category),
            "khg_id": str(cell.khg_id),
        }

    return {
        "found": False,
        "message": f"Sel atau koordinat '{q_clean}' tidak ditemukan dalam cakupan 6 episentrum nasional.",
    }


@router.get("/{cell_id}/inspect", response_model=CellRiskResponse)
def inspect_cell_details(
    cell_id: str = Path(..., description="Unique 1 km grid cell identifier (e.g. OKI_GRID_1042)"),
) -> CellRiskResponse:
    cell = cell_service.inspect_cell(cell_id)
    if not cell:
        raise HTTPException(status_code=404, detail=f"Cell '{cell_id}' not found in risk dataset")
    return cell
