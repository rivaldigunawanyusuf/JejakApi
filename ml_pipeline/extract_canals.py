"""Extract canal density per 1 km cell from Dadap et al. (2021) GeoTIFFs.

Usage:
    uv run python extract_canals.py \
        [--grid data/interim/oki_grid_1km.parquet] \
        [--zip data/raw/canals/geotiffs.zip] \
        [--out data/interim/canals_density.parquet]
"""

from __future__ import annotations

import argparse
import zipfile
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import box

from jejak_pipeline import boundary, canals, config, grid


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--grid",
        help="Path to precomputed OKI 1 km grid (.parquet or .gpkg)",
    )
    parser.add_argument(
        "--boundary",
        help="Path to OKI boundary (used if --grid is not provided)",
    )
    parser.add_argument(
        "--zip",
        default=str(config.RAW_DIR / "canals" / "geotiffs.zip"),
        help="Path to geotiffs.zip from Stanford Digital Repository",
    )
    parser.add_argument(
        "--out",
        default=str(config.INTERIM_DIR / "canals_density.parquet"),
        help="Output Parquet path",
    )
    args = parser.parse_args()

    zip_path = Path(args.zip)
    if not zip_path.is_file():
        raise FileNotFoundError(
            f"Canal zip archive not found at {zip_path}. "
            "Download from https://stacks.stanford.edu/file/yj761xk5815/geotiffs.zip"
        )

    # 1. Load or build grid
    if args.grid and Path(args.grid).is_file():
        print(f"Loading grid from {args.grid}...")
        if args.grid.endswith(".parquet"):
            cells = gpd.read_parquet(args.grid)
        else:
            cells = gpd.read_file(args.grid)
    elif args.boundary and Path(args.boundary).is_file():
        print(f"Building 1 km grid from boundary {args.boundary}...")
        b = gpd.read_file(args.boundary)
        cells = grid.build_grid(b)
    else:
        print("Using OKI bounding box envelope to build prototype grid...")
        minx, miny, maxx, maxy = config.OKI_SANITY_BBOX
        b = gpd.GeoDataFrame(
            geometry=[box(minx, miny, maxx, maxy)], crs="EPSG:4326"
        )
        cells = grid.build_grid(b)

    print(f"Total cells to compute: {len(cells)}")

    # 2. Find intersecting tiles analytically
    wgs_bounds = boundary.bbox_from_boundary(cells, buffer_deg=0.02)
    candidate_names = canals.tile_names_for_bbox(wgs_bounds)
    print(f"Candidate tiles in bounding box: {len(candidate_names)}")

    with zipfile.ZipFile(zip_path) as zf:
        namelist = set(zf.namelist())

    matching = [t for t in candidate_names if t in namelist]
    print(f"Present canal tiles covering study area: {len(matching)}")

    tile_vsi_paths = [f"/vsizip/{zip_path.as_posix()}/{t}" for t in matching]

    # 3. Compute canal density
    print("Computing canal density per cell...")
    density = canals.canal_density_from_tiles(tile_vsi_paths, cells)

    out_df = pd.DataFrame(
        {
            "cell_id": cells["cell_id"],
            "canal_density_km_km2": density,
        }
    )

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_df.to_parquet(out_path, index=False)
    print(f"Successfully wrote {len(out_df)} cells to {out_path}")
    print(f"Summary stats:\n{out_df['canal_density_km_km2'].describe()}")


if __name__ == "__main__":
    main()
