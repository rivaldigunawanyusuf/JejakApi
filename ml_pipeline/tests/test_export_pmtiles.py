"""Unit tests for PMTiles export pipeline."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import geopandas as gpd
import pandas as pd
from shapely.geometry import Polygon

from export_pmtiles import export_pmtiles


def test_export_pmtiles_reprojects_to_wgs84(tmp_path: Path) -> None:
    # Create mock grid in UTM 48S
    grid_df = gpd.GeoDataFrame(
        {
            "cell_id": ["CELL_1", "CELL_2"],
            "geometry": [
                Polygon([(500000, 9600000), (501000, 9600000), (501000, 9601000), (500000, 9601000)]),
                Polygon([(501000, 9600000), (502000, 9600000), (502000, 9601000), (501000, 9601000)]),
            ],
        },
        crs="EPSG:32748",
    )
    grid_path = tmp_path / "grid.parquet"
    grid_df.to_parquet(grid_path)

    # Create mock risk predictions
    risk_df = pd.DataFrame(
        {
            "cell_id": ["CELL_1", "CELL_2"],
            "risk_score": [0.85, 0.45],
            "risk_category": ["Bahaya", "Siaga"],
            "khg_id": ["KHG_1", "KHG_1"],
            "canal_density_km_km2": [2.5, 1.2],
            "distance_to_road_m": [100.0, 250.0],
            "distance_to_waterway_m": [500.0, 600.0],
            "top_factor_1_name": ["dc", "dmc"],
            "top_factor_1_score": [0.12, 0.08],
        }
    )
    risk_path = tmp_path / "risk.parquet"
    risk_df.to_parquet(risk_path)

    out_pmtiles = tmp_path / "out.pmtiles"

    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stderr="")
        result = export_pmtiles(risk_path, grid_path, out_pmtiles, min_zoom=7, max_zoom=14)

        assert result == out_pmtiles
        mock_run.assert_called_once()
        cmd = mock_run.call_args[0][0]
        assert cmd[0] == "tippecanoe"
        assert "-l" in cmd and "oki_risk" in cmd
        assert "-Z7" in cmd and "-z14" in cmd

        # Check that exported geojson is in WGS84 coordinates
        geojson_path = risk_path.with_suffix(".geojson")
        assert geojson_path.is_file()
        exported_gdf = gpd.read_file(geojson_path)
        assert exported_gdf.crs.to_epsg() == 4326
        # Lon should be in [100, 110], Lat in [-5, 0]
        bounds = exported_gdf.total_bounds
        assert 104.0 <= bounds[0] <= 106.0
        assert -4.0 <= bounds[1] <= -3.0
