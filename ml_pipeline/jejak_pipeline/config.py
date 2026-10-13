"""Central configuration constants for the JEJAK API offline pipeline."""

from __future__ import annotations

import os
from pathlib import Path

# ---- Spatial reference -------------------------------------------------------
# UTM zone 48S covers 102E-108E, i.e. the whole of Kabupaten OKI (Sumatera Selatan).
GRID_CRS: str = "EPSG:32748"
CELL_SIZE_M: int = 1000

# Fixed grid origin (metres, EPSG:32748) so that cell_id depends only on the cell's
# physical position and never on the boundary used to clip the grid.
GRID_ORIGIN_X_KM: int = 400
GRID_ORIGIN_Y_KM: int = 9500
GRID_N_COLS: int = 300  # 300 km east-west envelope, comfortably covers OKI
GRID_N_ROWS: int = 300  # 300 km north-south envelope
CELL_ID_PREFIX: str = "OKI_GRID_"

# Rough WGS84 sanity envelope for OKI (minx, miny, maxx, maxy). Only for validation.
OKI_SANITY_BBOX: tuple[float, float, float, float] = (103.5, -4.9, 107.0, -2.0)

# ---- Temporal design ---------------------------------------------------------
FORECAST_HORIZON_DAYS: int = 30
ISSUE_FREQUENCY_DAYS: int = 7
# Clearing-signal windows as (days_before_t0_lower, days_before_t0_upper), [lo, hi).
CLEARING_WINDOWS: tuple[tuple[int, int], ...] = ((0, 30), (30, 90), (90, 365))

# ---- Canadian FWI equatorial constants (cffdrs convention) -------------------
# Day-length adjustment factors for latitudes between -20 and 20 degrees.
DMC_DAYLENGTH_EQUATORIAL: float = 9.0
DC_DAYLENGTH_EQUATORIAL: float = 1.4
DMC_INITIAL: float = 6.0
DC_INITIAL: float = 15.0

# ---- Paths -------------------------------------------------------------------
PIPELINE_ROOT: Path = Path(__file__).resolve().parents[1]
DATA_DIR: Path = Path(os.environ.get("JEJAK_DATA_DIR", PIPELINE_ROOT / "data"))
RAW_DIR: Path = DATA_DIR / "raw"
INTERIM_DIR: Path = DATA_DIR / "interim"
PROCESSED_DIR: Path = DATA_DIR / "processed"

# ---- Earth Engine (offline use only; never imported by the backend) ----------
GEE_PROJECT_ENV: str = "GEE_PROJECT"
