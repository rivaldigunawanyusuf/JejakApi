"""Tests for deriving canal density from Dadap et al. binary canal rasters."""

import numpy as np
import pandas as pd
import pytest
import rasterio
from rasterio.transform import from_origin

from jejak_pipeline import canals, config, grid
import geopandas as gpd
from shapely.geometry import box


def _write_tif(path, array, crs, west, north, res):
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=array.shape[0],
        width=array.shape[1],
        count=1,
        dtype="uint8",
        crs=crs,
        transform=from_origin(west, north, res, res),
    ) as dst:
        dst.write(array, 1)


@pytest.fixture
def small_grid():
    b = gpd.GeoDataFrame(
        geometry=[box(500_000, 9_650_000, 504_000, 9_652_000)], crs=config.GRID_CRS
    ).to_crs(4326)
    return grid.build_grid(b)


def test_canal_pixel_counts_in_utm_raster(tmp_path):
    # 10 m pixels covering x 500_000..502_000, y 9_651_000..9_650_000 (200 x 100 px)
    arr = np.zeros((100, 200), dtype="uint8")
    arr[10, 0:100] = 1  # 100 canal px in cell x=[500k,501k]
    arr[60, 120:150] = 1  # 30 canal px in cell x=[501k,502k]
    p = tmp_path / "t.tif"
    _write_tif(p, arr, config.GRID_CRS, 500_000, 9_651_000, 10.0)
    counts = canals.canal_pixel_counts(p)
    assert counts.sum() == 130
    assert counts.nunique() == 2
    assert sorted(counts.values) == [30, 100]


def test_ground_pixel_size_utm_equals_resolution(tmp_path):
    arr = np.zeros((50, 50), dtype="uint8")
    p = tmp_path / "t.tif"
    _write_tif(p, arr, config.GRID_CRS, 500_000, 9_651_000, 10.0)
    with rasterio.open(p) as ds:
        assert canals.ground_pixel_size_m(ds) == pytest.approx(10.0, rel=1e-3)


def test_ground_pixel_size_web_mercator_shrinks_by_cos_lat(tmp_path):
    # EPSG:3857 pixel of 4.777 m at ~-3.2 deg latitude is ~4.77 m on the ground
    arr = np.zeros((50, 50), dtype="uint8")
    p = tmp_path / "m.tif"
    _write_tif(p, arr, "EPSG:3857", 11_700_000, -356_000, 4.77731426716)
    with rasterio.open(p) as ds:
        size = canals.ground_pixel_size_m(ds)
    assert size == pytest.approx(4.77731426716 * np.cos(np.deg2rad(3.2)), rel=2e-3)


def test_empty_raster_gives_empty_counts(tmp_path):
    arr = np.zeros((20, 20), dtype="uint8")
    p = tmp_path / "e.tif"
    _write_tif(p, arr, config.GRID_CRS, 500_000, 9_651_000, 10.0)
    counts = canals.canal_pixel_counts(p)
    assert len(counts) == 0


def test_density_from_tiles_converts_pixels_to_km_per_km2(tmp_path, small_grid):
    arr = np.zeros((100, 200), dtype="uint8")
    arr[10, 0:100] = 1  # 100 px * 10 m = 1.0 km in first cell
    p = tmp_path / "t.tif"
    _write_tif(p, arr, config.GRID_CRS, 500_000, 9_651_000, 10.0)
    out = canals.canal_density_from_tiles([p], small_grid)
    assert out.name == "canal_density_km_km2"
    assert len(out) == len(small_grid)
    assert out.max() == pytest.approx(1.0, rel=1e-3)
    assert out.sum() == pytest.approx(1.0, rel=1e-3)
    assert (out >= 0).all()


def test_density_sums_over_overlapping_tile_set(tmp_path, small_grid):
    arr = np.zeros((100, 100), dtype="uint8")
    arr[5, 0:50] = 1
    p1, p2 = tmp_path / "a.tif", tmp_path / "b.tif"
    _write_tif(p1, arr, config.GRID_CRS, 500_000, 9_651_000, 10.0)
    _write_tif(p2, arr, config.GRID_CRS, 502_000, 9_651_000, 10.0)
    out = canals.canal_density_from_tiles([p1, p2], small_grid)
    assert out.sum() == pytest.approx(2 * 0.5, rel=1e-3)


def test_density_no_tiles_means_unknown_not_zero(small_grid):
    out = canals.canal_density_from_tiles([], small_grid)
    assert out.isna().all()


def test_tile_intersects_bbox(tmp_path):
    arr = np.zeros((10, 10), dtype="uint8")
    p = tmp_path / "t.tif"
    _write_tif(p, arr, config.GRID_CRS, 500_000, 9_651_000, 10.0)
    assert canals.tile_intersects_bbox(p, (104.9, -3.3, 105.2, -3.0))
    assert not canals.tile_intersects_bbox(p, (110.0, -3.3, 111.0, -3.0))
