"""Compute static features (canal density, road distance, waterway distance, KHG) per 1 km cell.

Usage:
    uv run python extract_static_features.py \
        [--grid data/interim/oki_grid_1km.parquet] \
        [--canals data/interim/canals_density.parquet] \
        [--roads data/raw/osm/roads.parquet] \
        [--waterways data/raw/osm/waterways.parquet] \
        [--khg data/raw/boundaries/oki_khg.geojson] \
        [--out data/processed/oki_static_features_1km.parquet]
"""

from __future__ import annotations

import argparse
from pathlib import Path

import geopandas as gpd
import pandas as pd

from jejak_pipeline import config, static_features


def compute_static_features(
    grid_gdf: gpd.GeoDataFrame,
    canals_df: pd.DataFrame,
    roads_gdf: gpd.GeoDataFrame,
    waterways_gdf: gpd.GeoDataFrame,
    khg_gdf: gpd.GeoDataFrame,
) -> pd.DataFrame:
    """Combine static features aligned by cell_id."""
    df = pd.DataFrame(
        {
            "cell_id": grid_gdf["cell_id"],
            "lon": grid_gdf["lon"],
            "lat": grid_gdf["lat"],
        }
    )

    # 1. Canal density
    if "canal_density_km_km2" in canals_df.columns:
        canal_map = dict(zip(canals_df["cell_id"], canals_df["canal_density_km_km2"]))
        df["canal_density_km_km2"] = df["cell_id"].map(canal_map).fillna(0.0)
    else:
        df["canal_density_km_km2"] = 0.0

    # 2. Distance to nearest road (m)
    print("Computing distance to nearest road...")
    road_dist = static_features.distance_to_nearest_m(
        grid_gdf, roads_gdf, "distance_to_road_m"
    )
    df["distance_to_road_m"] = road_dist.values

    # 3. Distance to nearest waterway (m)
    print("Computing distance to nearest waterway...")
    waterway_dist = static_features.distance_to_nearest_m(
        grid_gdf, waterways_gdf, "distance_to_waterway_m"
    )
    df["distance_to_waterway_m"] = waterway_dist.values

    # 4. Assign KHG unit
    print("Assigning KHG units...")
    khg_series = static_features.assign_khg(grid_gdf, khg_gdf)
    df["khg_id"] = khg_series.values

    return df


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--grid",
        default=str(config.INTERIM_DIR / "oki_grid_1km.parquet"),
        help="Path to oki_grid_1km.parquet",
    )
    parser.add_argument(
        "--canals",
        default=str(config.INTERIM_DIR / "canals_density.parquet"),
        help="Path to canals_density.parquet",
    )
    parser.add_argument(
        "--roads",
        default=str(config.RAW_DIR / "osm" / "roads.parquet"),
        help="Path to roads.parquet",
    )
    parser.add_argument(
        "--waterways",
        default=str(config.RAW_DIR / "osm" / "waterways.parquet"),
        help="Path to waterways.parquet",
    )
    parser.add_argument(
        "--khg",
        default=str(config.RAW_DIR / "boundaries" / "oki_khg.geojson"),
        help="Path to oki_khg.geojson",
    )
    parser.add_argument(
        "--out",
        default=str(config.PROCESSED_DIR / "oki_static_features_1km.parquet"),
        help="Path to output static features parquet",
    )
    args = parser.parse_args()

    print(f"Loading grid from {args.grid}...")
    grid_gdf = gpd.read_parquet(args.grid)

    print(f"Loading canal density from {args.canals}...")
    canals_df = pd.read_parquet(args.canals)

    print(f"Loading roads from {args.roads}...")
    roads_gdf = gpd.read_parquet(args.roads) if Path(args.roads).is_file() else gpd.GeoDataFrame(geometry=[], crs=4326)

    print(f"Loading waterways from {args.waterways}...")
    waterways_gdf = gpd.read_parquet(args.waterways) if Path(args.waterways).is_file() else gpd.GeoDataFrame(geometry=[], crs=4326)

    print(f"Loading KHG from {args.khg}...")
    khg_gdf = gpd.read_file(args.khg) if Path(args.khg).is_file() else gpd.GeoDataFrame(geometry=[], crs=4326)

    static_df = compute_static_features(
        grid_gdf=grid_gdf,
        canals_df=canals_df,
        roads_gdf=roads_gdf,
        waterways_gdf=waterways_gdf,
        khg_gdf=khg_gdf,
    )

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    static_df.to_parquet(out_path, index=False)
    print(f"Successfully wrote {len(static_df)} static feature rows to {out_path}!")
    print(static_df.describe())
    print("\nKHG breakdown:\n", static_df["khg_id"].value_counts())


if __name__ == "__main__":
    main()
