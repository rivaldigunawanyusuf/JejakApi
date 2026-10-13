"""Time-invariant anthropogenic / hydrological features per 1 km cell."""

from __future__ import annotations

import geopandas as gpd
import numpy as np
import pandas as pd
import shapely

from . import config

NON_KHG = "NON_KHG"


def _to_grid_crs(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    return gdf.to_crs(config.GRID_CRS)


def _is_empty(gdf: gpd.GeoDataFrame) -> bool:
    return len(gdf) == 0


def canal_density(grid: gpd.GeoDataFrame, canals: gpd.GeoDataFrame) -> pd.Series:
    """Canal length per cell area (km / km^2), aligned to ``grid.index``."""
    name = "canal_density_km_km2"
    area_km2 = grid.geometry.area / 1e6
    if _is_empty(canals):
        return pd.Series(0.0, index=grid.index, name=name)
    lines = _to_grid_crs(canals)[["geometry"]]
    pieces = gpd.overlay(
        lines, grid[["cell_id", "geometry"]], how="intersection", keep_geom_type=True
    )
    km = pieces.geometry.length.groupby(pieces["cell_id"]).sum() / 1000.0
    length = grid["cell_id"].map(km).fillna(0.0)
    return (length / area_km2).rename(name)


def distance_to_nearest_m(
    grid: gpd.GeoDataFrame, lines: gpd.GeoDataFrame, name: str
) -> pd.Series:
    """Distance (m) from each cell centroid to the nearest feature in ``lines``.

    Returns NaN everywhere when ``lines`` is empty (data gap, not "far away").
    """
    if _is_empty(lines):
        return pd.Series(np.nan, index=grid.index, name=name)
    centroids = gpd.GeoDataFrame(
        geometry=grid.geometry.centroid, index=grid.index, crs=grid.crs
    )
    nearest = gpd.sjoin_nearest(
        centroids, _to_grid_crs(lines)[["geometry"]], distance_col="_d"
    )
    nearest = nearest[~nearest.index.duplicated(keep="first")]
    return nearest["_d"].reindex(grid.index).rename(name)


def assign_khg(grid: gpd.GeoDataFrame, khg: gpd.GeoDataFrame) -> pd.Series:
    """Assign each cell to the Kesatuan Hidrologis Gambut containing its centroid.

    Cells outside every KHG polygon get ``"NON_KHG"``. The ``khg_id`` is the unit
    for Spatial Block Cross-Validation in Phase 2.
    """
    name = "khg_id"
    if _is_empty(khg):
        return pd.Series(NON_KHG, index=grid.index, name=name)
    centroids = gpd.GeoDataFrame(
        geometry=grid.geometry.centroid, index=grid.index, crs=grid.crs
    )
    joined = gpd.sjoin(
        centroids, _to_grid_crs(khg)[["khg_id", "geometry"]], predicate="within"
    )
    joined = joined[~joined.index.duplicated(keep="first")]
    return joined["khg_id"].reindex(grid.index).fillna(NON_KHG).rename(name)


def polygon_cover_fraction(
    grid: gpd.GeoDataFrame, polygons: gpd.GeoDataFrame, name: str
) -> pd.Series:
    """Fraction (0-1) of each cell covered by ``polygons`` (overlaps counted once)."""
    if _is_empty(polygons):
        return pd.Series(0.0, index=grid.index, name=name)
    merged = shapely.union_all(_to_grid_crs(polygons).geometry.values)
    layer = gpd.GeoDataFrame(geometry=[merged], crs=config.GRID_CRS)
    pieces = gpd.overlay(
        grid[["cell_id", "geometry"]], layer, how="intersection", keep_geom_type=True
    )
    covered = pieces.geometry.area.groupby(pieces["cell_id"]).sum()
    frac = grid["cell_id"].map(covered).fillna(0.0) / grid.geometry.area
    return frac.clip(0.0, 1.0).rename(name)
