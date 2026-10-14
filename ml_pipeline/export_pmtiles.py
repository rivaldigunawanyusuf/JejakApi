"""Export processed risk predictions to PMTiles vector tiles using Tippecanoe.

Generates:
- ml_pipeline/data/processed/oki_risk_latest.geojson (EPSG:4326)
- ml_pipeline/data/processed/oki_risk_latest.pmtiles
- frontend/public/tiles/oki_risk_latest.pmtiles

Usage:
    uv run python export_pmtiles.py
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path

import geopandas as gpd
import pandas as pd

from jejak_pipeline import config


def export_pmtiles(
    risk_parquet_path: Path,
    grid_parquet_path: Path,
    output_pmtiles_path: Path,
    min_zoom: int = 3,
    max_zoom: int = 14,
) -> Path:
    """Merge predictions with grid geometries, convert to EPSG:4326 GeoJSON, and compile PMTiles."""
    if not risk_parquet_path.is_file():
        raise FileNotFoundError(f"Risk parquet not found at {risk_parquet_path}")
    if not grid_parquet_path.is_file():
        raise FileNotFoundError(f"Grid parquet not found at {grid_parquet_path}")

    print(f"Reading risk predictions from {risk_parquet_path}...")
    risk_df = pd.read_parquet(risk_parquet_path)

    print(f"Reading grid geometries from {grid_parquet_path}...")
    grid_gdf = gpd.read_parquet(grid_parquet_path)

    print("Merging predictions with grid geometries...")
    merged_gdf = grid_gdf[["cell_id", "geometry"]].merge(risk_df, on="cell_id")

    slim_cols = [
        "cell_id",
        "risk_score",
        "risk_category",
        "khg_id",
        "canal_density_km_km2",
        "distance_to_road_m",
        "distance_to_waterway_m",
        "top_factor_1_name",
        "top_factor_1_score",
        "geometry",
    ]
    available_cols = [c for c in slim_cols if c in merged_gdf.columns]
    export_gdf = gpd.GeoDataFrame(merged_gdf[available_cols], geometry="geometry", crs=grid_gdf.crs)

    if export_gdf.crs != "EPSG:4326":
        print(f"Reprojecting geometries from {export_gdf.crs} to EPSG:4326...")
        export_gdf = export_gdf.to_crs(epsg=4326)

    geojson_path = risk_parquet_path.with_suffix(".geojson")
    print(f"Writing WGS84 GeoJSON to {geojson_path}...")
    export_gdf.to_file(geojson_path, driver="GeoJSON")

    output_pmtiles_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "tippecanoe",
        "-o",
        str(output_pmtiles_path),
        "-l",
        "oki_risk",
        f"-Z{min_zoom}",
        f"-z{max_zoom}",
        "--no-tile-size-limit",
        "--no-feature-limit",
        "--no-tiny-polygon-reduction",
        "--force",
        str(geojson_path),
    ]

    print(f"Running Tippecanoe: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Tippecanoe compilation failed:\n{result.stderr}")

    print(f"PMTiles successfully compiled to {output_pmtiles_path}!")
    return output_pmtiles_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--risk",
        default=str(config.PROCESSED_DIR / "oki_risk_latest.parquet"),
        help="Path to oki_risk_latest.parquet",
    )
    parser.add_argument(
        "--grid",
        default=str(config.INTERIM_DIR / "oki_grid_1km.parquet"),
        help="Path to oki_grid_1km.parquet",
    )
    parser.add_argument(
        "--out",
        default=str(config.PROCESSED_DIR / "oki_risk_latest.pmtiles"),
        help="Path to output PMTiles",
    )
    parser.add_argument(
        "--min-zoom",
        type=int,
        default=3,
        help="Minimum vector tile zoom level (default: 3 for regional scale)",
    )
    parser.add_argument(
        "--max-zoom",
        type=int,
        default=14,
        help="Maximum vector tile zoom level (default: 14)",
    )
    args = parser.parse_args()

    risk_path = Path(args.risk)
    grid_path = Path(args.grid)
    out_pmtiles = Path(args.out)

    export_pmtiles(
        risk_path,
        grid_path,
        out_pmtiles,
        min_zoom=args.min_zoom,
        max_zoom=args.max_zoom,
    )

    # Copy to frontend/public/tiles/ for MapLibre serving
    frontend_tiles_dir = config.PIPELINE_ROOT.parent / "frontend" / "public" / "tiles"
    frontend_tiles_dir.mkdir(parents=True, exist_ok=True)
    frontend_pmtiles = frontend_tiles_dir / "oki_risk_latest.pmtiles"
    shutil.copyfile(out_pmtiles, frontend_pmtiles)
    print(f"Copied PMTiles to frontend public directory: {frontend_pmtiles}")


if __name__ == "__main__":
    main()
