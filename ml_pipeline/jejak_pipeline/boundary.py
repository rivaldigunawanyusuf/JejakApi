"""Study-area boundary helpers (Kabupaten OKI)."""

from __future__ import annotations

import geopandas as gpd


def bbox_from_boundary(
    gdf: gpd.GeoDataFrame, buffer_deg: float = 0.05
) -> tuple[float, float, float, float]:
    """Return ``(west, south, east, north)`` in WGS84 with a degree buffer."""
    minx, miny, maxx, maxy = gdf.to_crs(4326).total_bounds
    return (
        float(minx - buffer_deg),
        float(miny - buffer_deg),
        float(maxx + buffer_deg),
        float(maxy + buffer_deg),
    )


def filter_regency(
    gdf: gpd.GeoDataFrame, name: str = "Ogan Komering Ilir"
) -> gpd.GeoDataFrame:
    """Filter an administrative GeoDataFrame for a specific regency (Kabupaten)."""
    candidates = [
        "adm2_name",
        "adm2_en",
        "admin2name_en",
        "kab_kota",
        "wadmkk",
        "name_2",
        "kabupaten",
    ]
    col_map = {col.lower(): col for col in gdf.columns}
    for cand in candidates:
        if cand in col_map:
            actual_col = col_map[cand]
            matches = gdf[
                gdf[actual_col].astype(str).str.strip().str.lower() == name.lower()
            ]
            if not matches.empty:
                return matches.to_crs(4326).reset_index(drop=True)
    raise ValueError(f"Regency {name!r} not found in dataset columns: {list(gdf.columns)}")


