"""Model evaluation, comparative benchmark, and probability calibration endpoints."""

from __future__ import annotations

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

from app.core import config
from app.models.schemas import BenchmarkResponse

router = APIRouter(prefix="/api/model", tags=["Model Benchmark"])

BENCHMARK_PATH = config.BACKEND_DIR / "data" / "benchmark_results.json"


@router.get("/benchmark", response_model=BenchmarkResponse)
def get_model_benchmark() -> BenchmarkResponse:
    """Retrieve multi-tier model progression benchmark metrics (Feature F3 & Competition Scientific Audit).

    Compares:
    - Baseline 0: Pure Weather (FWI hazard proxy)
    - Baseline 1: Weather + Fire History
    - Model Full: LightGBM with Anthropogenic Features (Canals, Deforestation, Access Roads)
    Includes Platt calibration and rare-event evaluation metrics (PR-AUC, Recall@top-5%, Brier Score, ECE).
    """
    if not BENCHMARK_PATH.is_file():
        # Check ml_pipeline directory fallback
        pipeline_path = config.BACKEND_DIR.parent / "ml_pipeline" / "benchmark_results.json"
        if pipeline_path.is_file():
            target_path = pipeline_path
        else:
            raise HTTPException(
                status_code=503,
                detail="Benchmark results not yet generated. Execute `uv run python benchmark_models.py` in ml_pipeline.",
            )
    else:
        target_path = BENCHMARK_PATH

    try:
        with open(target_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return BenchmarkResponse(**data)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read benchmark results: {str(exc)}",
        )
