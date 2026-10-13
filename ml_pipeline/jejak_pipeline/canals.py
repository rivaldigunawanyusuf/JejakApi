"""Canal density from the Dadap et al. (2021) binary drainage-canal rasters.

Source: Stanford Digital Repository, doi:10.25740/yj761xk5815 (``geotiffs.zip``).
Tiles are 4096 x 4096 uint8 GeoTIFFs (EPSG:3857, ~4.78 m pixels), 1 = canal.

Canals are drawn as thin lines, so ``pixel_count * ground_pixel_size`` is used as a
*proxy* for canal length. It is not an exact length (diagonal and multi-pixel-wide
segments are over-/under-counted) but is monotonic in true canal length, which is
what the tree model needs.
"""

from __future__ import annotations

import zipfile
from collections.abc import Sequence
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio
from pyproj import Transformer
from rasterio.warp import transform_bounds
from shapely.geometry import box

from . import config, grid


_TILE_SPAN_3857: float = 19567.879238286987
_ORIGIN_3857: float = 20037508.342789244


def tile_names_for_bbox(
    bbox: tuple[float, float, float, float]
) -> list[str]:
    """Return all Dadap et al. tile names (e.g. ``geotiffs/L15-1566E-1050N.tif``)
    that intersect a WGS84 ``(west, south, east, north)`` bounding box.
    """
    to_3857 = Transformer.from_crs(4326, 3857, always_xy=True)
    minx, miny, maxx, maxy = bbox
    x0, y0 = to_3857.transform(minx, miny)
    x1, y1 = to_3857.transform(maxx, maxy)

    ix0 = int(np.floor((x0 + _ORIGIN_3857) / _TILE_SPAN_3857))
    ix1 = int(np.floor((x1 + _ORIGIN_3857) / _TILE_SPAN_3857))
    iy0 = int(np.floor((y0 + _ORIGIN_3857) / _TILE_SPAN_3857))
    iy1 = int(np.floor((y1 + _ORIGIN_3857) / _TILE_SPAN_3857))

    names = []
    for x in range(ix0, ix1 + 1):
        for y in range(iy0, iy1 + 1):
            names.append(f"geotiffs/L15-{x}E-{y}N.tif")
    return sorted(names)


def zip_tile_paths(zip_path: str | Path) -> list[str]:
    """List GDAL ``/vsizip/`` paths for every ``.tif`` inside the canal archive."""
    with zipfile.ZipFile(zip_path) as zf:
        names = [n for n in zf.namelist() if n.lower().endswith(".tif")]
    return [f"/vsizip/{Path(zip_path).as_posix()}/{n}" for n in sorted(names)]


def tile_intersects_bbox(
    path: str | Path, bbox: tuple[float, float, float, float]
) -> bool:
    """True if the raster footprint intersects a WGS84 ``(w, s, e, n)`` bbox."""
    with rasterio.open(path) as ds:
        footprint = box(*transform_bounds(ds.crs, 4326, *ds.bounds))
    return footprint.intersects(box(*bbox))


def ground_pixel_size_m(ds: rasterio.io.DatasetReader) -> float:
    """Ground size (m) of one pixel at the raster centre, in the metric grid CRS.

    Corrects the latitude scale distortion of Web Mercator (EPSG:3857).
    """
    to_utm = Transformer.from_crs(ds.crs, config.GRID_CRS, always_xy=True)
    row, col = ds.height // 2, ds.width // 2
    x0, y0 = ds.transform @ (col + 0.5, row + 0.5)
    x1, y1 = ds.transform @ (col + 1.5, row + 0.5)
    ux, uy = to_utm.transform([x0, x1], [y0, y1])
    return float(np.hypot(ux[1] - ux[0], uy[1] - uy[0]))


def canal_pixel_counts(path: str | Path) -> pd.Series:
    """Count canal pixels (value 1) per 1 km ``cell_id`` for a single tile."""
    with rasterio.open(path) as ds:
        data = ds.read(1)
        rows, cols = np.nonzero(data == 1)
        if len(rows) == 0:
            return pd.Series(dtype="int64", name="pixels")
        xs, ys = ds.transform @ (cols + 0.5, rows + 0.5)
        lon, lat = Transformer.from_crs(ds.crs, 4326, always_xy=True).transform(xs, ys)
    ids = grid.cell_ids_for_lonlat(lon, lat)
    return pd.Series(ids).value_counts().rename("pixels").astype("int64")


def canal_density_from_tiles(
    paths: Sequence[str | Path], cells: gpd.GeoDataFrame
) -> pd.Series:
    """Canal length proxy per cell area (km / km^2), aligned to ``cells.index``.

    Returns NaN everywhere when ``paths`` is empty (unknown, not "no canals").
    """
    name = "canal_density_km_km2"
    if len(paths) == 0:
        return pd.Series(np.nan, index=cells.index, name=name)
    length_m = pd.Series(dtype="float64")
    for path in paths:
        counts = canal_pixel_counts(path)
        if len(counts) == 0:
            continue
        with rasterio.open(path) as ds:
            size = ground_pixel_size_m(ds)
        length_m = length_m.add(counts * size, fill_value=0.0)
    area_km2 = cells.geometry.area / 1e6
    km = cells["cell_id"].map(length_m / 1000.0).fillna(0.0)
    return (km / area_km2).rename(name)
