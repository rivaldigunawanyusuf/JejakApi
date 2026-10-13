"""Download NASA FIRMS VIIRS S-NPP hotspots for OKI, one Parquet file per year.

Usage:
    uv run python fetch_firms.py --start 2018-01-01 --end 2025-12-31 \
        [--boundary data/raw/boundaries/oki_boundary.gpkg]

Requires ``FIRMS_MAP_KEY`` in ``.env`` (free: https://firms.modaps.eosdis.nasa.gov/api/).
Finished past years are skipped, so the script is safely resumable.
"""

from __future__ import annotations

import argparse
import time
from datetime import date

import geopandas as gpd
import pandas as pd

from jejak_pipeline import boundary, config, env, firms
from jejak_pipeline import http as http_utils

THROTTLE_SECONDS = 4.0  # stay far below 5000 transactions / 10 min


def _throttled_get(url: str) -> str:
    time.sleep(THROTTLE_SECONDS)
    return http_utils.get_text(url)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    parser.add_argument("--source", default=firms.DEFAULT_SOURCE)
    parser.add_argument("--boundary", help="OKI boundary file to derive the bbox")
    args = parser.parse_args()

    env.load_env()
    map_key = env.require("FIRMS_MAP_KEY")
    if args.boundary:
        bbox = boundary.bbox_from_boundary(gpd.read_file(args.boundary))
    else:
        bbox = config.OKI_SANITY_BBOX
        print(f"No --boundary given, using coarse bbox {bbox}")

    out_dir = config.RAW_DIR / "firms"
    out_dir.mkdir(parents=True, exist_ok=True)
    start, end = pd.Timestamp(args.start), pd.Timestamp(args.end)
    for year in range(start.year, end.year + 1):
        y_start = max(start, pd.Timestamp(year, 1, 1))
        y_end = min(end, pd.Timestamp(year, 12, 31))
        path = out_dir / f"viirs_snpp_{year}.parquet"
        if path.exists() and year < date.today().year:
            print(f"{year}: exists, skipping")
            continue
        print(f"{year}: downloading {y_start:%Y-%m-%d} .. {y_end:%Y-%m-%d}")
        df = firms.fetch_firms(
            map_key, args.source, bbox, y_start, y_end, get=_throttled_get
        )
        df = firms.hotspots_to_cells(df)
        df.to_parquet(path, index=False)
        print(f"{year}: {len(df)} hotspots -> {path}")


if __name__ == "__main__":
    main()
