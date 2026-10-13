"""OpenStreetMap roads and waterways via the Overpass API."""

from __future__ import annotations

import json
import urllib.parse
from collections.abc import Callable

from typing import Any

import geopandas as gpd
import pandas as pd
from shapely.geometry import LineString

from . import http as http_utils

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
]
_FILTERS = {
    "roads": (
        "highway",
        "motorway|trunk|primary|secondary|tertiary|unclassified|residential|track|service",
    ),
    "waterways": ("waterway", "river|stream|canal|drain|ditch"),
}


def build_overpass_query(bbox: tuple[float, float, float, float], kind: str) -> str:
    """Build an Overpass QL query for ``roads`` or ``waterways`` in ``bbox``.

    Args:
        bbox: ``(west, south, east, north)`` in WGS84. Overpass wants
            ``(south, west, north, east)``; the swap is done here.
    """
    if kind not in _FILTERS:
        raise ValueError(f"kind must be one of {sorted(_FILTERS)}")
    tag, values = _FILTERS[kind]
    west, south, east, north = bbox
    return (
        "[out:json][timeout:300];\n"
        f'way["{tag}"~"^({values})$"]({south},{west},{north},{east});\n'
        "out geom;"
    )


def parse_overpass_ways(payload: dict) -> gpd.GeoDataFrame:
    """Convert an Overpass ``out geom`` JSON payload to LineString features."""
    rows, geoms = [], []
    for el in payload.get("elements", []):
        if el.get("type") != "way":
            continue
        coords = [(p["lon"], p["lat"]) for p in el.get("geometry", [])]
        if len(coords) < 2:
            continue
        tags = el.get("tags", {})
        rows.append(
            {
                "osm_id": el["id"],
                "feature_class": tags.get("highway") or tags.get("waterway"),
            }
        )
        geoms.append(LineString(coords))
    if not rows:
        return gpd.GeoDataFrame(
            {
                "osm_id": pd.Series(dtype="int64"),
                "feature_class": pd.Series(dtype=object),
            },
            geometry=[],
            crs=4326,
        )
    return gpd.GeoDataFrame(rows, geometry=geoms, crs=4326)


def split_bbox(
    bbox: tuple[float, float, float, float], nx: int, ny: int
) -> list[tuple[float, float, float, float]]:
    """Split ``bbox`` into ``nx * ny`` tiles to keep Overpass queries small."""
    west, south, east, north = bbox
    dx, dy = (east - west) / nx, (north - south) / ny
    return [
        (west + i * dx, south + j * dy, west + (i + 1) * dx, south + (j + 1) * dy)
        for j in range(ny)
        for i in range(nx)
    ]


def _overpass_post(query: str) -> dict:
    body = urllib.parse.urlencode({"data": query}).encode()
    last_err: Exception | None = None
    for ep in OVERPASS_ENDPOINTS:
        try:
            return json.loads(http_utils.post_form(ep, body, retries=2, timeout=60.0))
        except Exception as e:
            last_err = e
            continue
    raise ConnectionError(f"All Overpass endpoints failed: {last_err}")



def fetch_ways(
    bbox: tuple[float, float, float, float],
    kind: str,
    nx: int = 4,
    ny: int = 4,
    post: Callable[[str], dict] = _overpass_post,
) -> gpd.GeoDataFrame:
    """Fetch roads/waterways tile by tile, merged and deduplicated by ``osm_id``."""
    tiles = split_bbox(bbox, nx, ny)
    frames = []
    for idx, tile in enumerate(tiles, start=1):
        try:
            res = post(build_overpass_query(tile, kind))
            sub_gdf = parse_overpass_ways(res)
            frames.append(sub_gdf)
            print(f"[{kind}] Tile {idx}/{len(tiles)}: {len(sub_gdf)} ways")
        except Exception as exc:
            print(f"[{kind}] Tile {idx}/{len(tiles)} warning: {exc}")
    if not frames:
        return gpd.GeoDataFrame(
            {"osm_id": pd.Series(dtype="int64"), "feature_class": pd.Series(dtype=object)},
            geometry=[],
            crs=4326,
        )
    merged = pd.concat(frames, ignore_index=True)
    merged = merged.drop_duplicates(subset="osm_id").reset_index(drop=True)
    return gpd.GeoDataFrame(merged, geometry="geometry", crs=4326)


HOT_OSM_URLS = {
    "roads": "https://production-raw-data-api.s3.amazonaws.com/ISO3/IDN/_layers/osm/roads.parquet",
    "waterways": "https://production-raw-data-api.s3.amazonaws.com/ISO3/IDN/_layers/osm/waterways.parquet",
}


def fetch_hot_osm(
    kind: str,
    regency: str = "Ogan Komering Ilir",
    con: Any | None = None,
) -> gpd.GeoDataFrame:
    """Fetch roads or waterways directly from HOT OSM GeoParquet using DuckDB HTTP Range Requests.

    Args:
        kind: 'roads' or 'waterways'.
        regency: Regency name to filter in ``adm2_name`` (default: 'Ogan Komering Ilir').
        con: Optional duckdb connection (creates in-memory connection if None).

    Returns:
        GeoDataFrame with columns ``['osm_id', 'feature_class', 'geometry']`` in EPSG:4326.
    """
    if kind not in HOT_OSM_URLS:
        raise ValueError(f"kind must be one of {sorted(HOT_OSM_URLS)}")

    import duckdb
    import shapely

    close_con = False
    if con is None:
        con = duckdb.connect()
        close_con = True

    try:
        con.execute("INSTALL httpfs; LOAD httpfs;")
        tag_col = "highway" if kind == "roads" else "waterway"
        url = HOT_OSM_URLS[kind]
        df = con.execute(f"""
            SELECT id AS osm_id, {tag_col} AS feature_class, geom
            FROM '{url}'
            WHERE adm2_name ILIKE '%{regency}%'
        """).fetchdf()

        if len(df) == 0:
            return gpd.GeoDataFrame(
                {"osm_id": pd.Series(dtype="object"), "feature_class": pd.Series(dtype=object)},
                geometry=[],
                crs=4326,
            )

        geoms = [shapely.from_wkb(bytes(g)) for g in df["geom"]]
        gdf = gpd.GeoDataFrame(
            df[["osm_id", "feature_class"]],
            geometry=geoms,
            crs=4326,
        )
        # Retain only line geometries (LineString, MultiLineString)
        gdf = gdf[gdf.geometry.geom_type.isin(["LineString", "MultiLineString"])].reset_index(drop=True)
        return gdf
    finally:
        if close_con:
            con.close()

