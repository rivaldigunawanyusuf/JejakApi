"""Deterministic 1 km x 1 km analysis grid for Kabupaten OKI."""

from __future__ import annotations

import geopandas as gpd
import numpy as np
import shapely
from pyproj import Transformer
from shapely.geometry import box

from . import config


def cell_id_from_index(ix: np.ndarray, iy: np.ndarray) -> np.ndarray:
    """Map integer km indices (UTM easting/northing // 1000) to stable cell ids.

    The id only depends on the physical position, so grids built from different
    boundaries share ids for the same cell.
    """
    col = np.asarray(ix) - config.GRID_ORIGIN_X_KM
    row = np.asarray(iy) - config.GRID_ORIGIN_Y_KM
    if (
        (col < 0).any()
        or (row < 0).any()
        or (col >= config.GRID_N_COLS).any()
        or (row >= config.GRID_N_ROWS).any()
    ):
        raise ValueError("Cell lies outside the fixed JEJAK grid envelope")
    numbers = row * config.GRID_N_COLS + col
    return np.array([f"{config.CELL_ID_PREFIX}{n:05d}" for n in numbers], dtype=object)


def cell_ids_for_lonlat(lon, lat) -> np.ndarray:
    """Return the ``cell_id`` of the 1 km cell containing each WGS84 point.

    Points outside the fixed grid envelope raise ``ValueError``; points inside the
    envelope but outside OKI simply yield ids absent from the clipped grid.
    """
    to_utm = Transformer.from_crs(4326, config.GRID_CRS, always_xy=True)
    x, y = to_utm.transform(np.asarray(lon, dtype=float), np.asarray(lat, dtype=float))
    size = config.CELL_SIZE_M
    ix = np.floor(np.asarray(x) / size).astype(int)
    iy = np.floor(np.asarray(y) / size).astype(int)
    return cell_id_from_index(ix, iy)


def build_grid(boundary: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Build the 1 km grid, keeping cells whose centroid falls inside ``boundary``.

    Args:
        boundary: Polygon(s) of the study area in any CRS.

    Returns:
        GeoDataFrame in ``config.GRID_CRS`` with columns ``cell_id``, ``lon``,
        ``lat``, ``geometry`` (square cell), sorted by ``cell_id``.
    """
    size = config.CELL_SIZE_M
    utm = boundary.to_crs(config.GRID_CRS)
    union = shapely.union_all(utm.geometry.values)
    minx, miny, maxx, maxy = union.bounds

    ix0, ix1 = int(np.floor(minx / size)), int(np.ceil(maxx / size))
    iy0, iy1 = int(np.floor(miny / size)), int(np.ceil(maxy / size))
    ixs, iys = np.meshgrid(np.arange(ix0, ix1), np.arange(iy0, iy1))
    ixs, iys = ixs.ravel(), iys.ravel()

    cx = (ixs + 0.5) * size
    cy = (iys + 0.5) * size
    inside = shapely.contains_xy(union, cx, cy)
    ixs, iys, cx, cy = ixs[inside], iys[inside], cx[inside], cy[inside]

    to_wgs = Transformer.from_crs(config.GRID_CRS, 4326, always_xy=True)
    lon, lat = to_wgs.transform(cx, cy)

    geoms = [
        box(i * size, j * size, (i + 1) * size, (j + 1) * size)
        for i, j in zip(ixs, iys)
    ]
    grid = gpd.GeoDataFrame(
        {
            "cell_id": cell_id_from_index(ixs, iys),
            "lon": lon,
            "lat": lat,
        },
        geometry=geoms,
        crs=config.GRID_CRS,
    )
    return grid.sort_values("cell_id").reset_index(drop=True)


def to_wgs84(grid: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Reproject the grid to EPSG:4326 (for GeoJSON / tippecanoe export)."""
    return grid.to_crs(4326)
