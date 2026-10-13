"""Download OSM roads and waterways for OKI into GeoParquet.

By default, queries HOT OSM open GeoParquet datasets using DuckDB HTTP Range Requests.
Optionally supports Overpass via `--overpass`.

Usage:
    uv run python fetch_osm.py [--regency "Ogan Komering Ilir"]

Outputs ``data/raw/osm/roads.parquet`` and ``data/raw/osm/waterways.parquet``.
"""

from __future__ import annotations

import argparse

import geopandas as gpd

from jejak_pipeline import boundary, config, osm


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--regency", default="Ogan Komering Ilir", help="Regency name")
    parser.add_argument("--overpass", action="store_true", help="Use Overpass API instead of HOT OSM")
    parser.add_argument("--boundary", help="Optional boundary file for Overpass bbox")
    parser.add_argument("--tiles", type=int, default=4, help="tiles per axis for Overpass")
    args = parser.parse_args()

    out_dir = config.RAW_DIR / "osm"
    out_dir.mkdir(parents=True, exist_ok=True)

    for kind in ("roads", "waterways"):
        path = out_dir / f"{kind}.parquet"
        if args.overpass:
            if args.boundary:
                bbox = boundary.bbox_from_boundary(gpd.read_file(args.boundary))
            else:
                bbox = config.OKI_SANITY_BBOX
                print(f"No --boundary given, using coarse bbox {bbox}")
            print(f"Fetching {kind} via Overpass ({args.tiles}x{args.tiles} tiles)...")
            gdf = osm.fetch_ways(bbox, kind, nx=args.tiles, ny=args.tiles)
        else:
            print(f"Fetching {kind} for {args.regency} via HOT OSM S3 GeoParquet...")
            gdf = osm.fetch_hot_osm(kind, regency=args.regency)

        gdf.to_parquet(path)
        print(f"{kind}: {len(gdf)} features -> {path}")


if __name__ == "__main__":
    main()
