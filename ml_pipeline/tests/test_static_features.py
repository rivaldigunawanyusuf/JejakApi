"""Tests for static (time-invariant) anthropogenic / hydrological features."""

import geopandas as gpd
import pytest
from shapely.geometry import LineString, Polygon, box

from jejak_pipeline import config, grid, static_features


@pytest.fixture
def small_grid():
    b = gpd.GeoDataFrame(
        geometry=[box(500_000, 9_650_000, 504_000, 9_652_000)], crs=config.GRID_CRS
    ).to_crs(4326)
    return grid.build_grid(b)  # 4 x 2 = 8 cells


def _utm_lines(lines):
    return gpd.GeoDataFrame(geometry=lines, crs=config.GRID_CRS).to_crs(4326)


def test_canal_density_km_per_km2(small_grid):
    # A 1 km canal fully inside the first cell, a 2 km canal crossing cells 2 & 3
    canals = _utm_lines(
        [
            LineString([(500_100, 9_650_500), (501_000 - 1, 9_650_500)]),  # 0.9 km
            LineString([(501_500, 9_651_500), (503_500, 9_651_500)]),  # 2 km
        ]
    )
    out = static_features.canal_density(small_grid, canals)
    assert out.name == "canal_density_km_km2"
    assert len(out) == len(small_grid)
    assert out.sum() == pytest.approx(0.899 + 2.0, abs=0.01)
    assert (out >= 0).all()


def test_canal_density_zero_when_no_canals(small_grid):
    empty = gpd.GeoDataFrame(geometry=[], crs=4326)
    out = static_features.canal_density(small_grid, empty)
    assert (out == 0).all()


def test_distance_to_nearest_line_m(small_grid):
    road = _utm_lines([LineString([(500_000, 9_650_000), (500_000, 9_652_000)])])
    d = static_features.distance_to_nearest_m(small_grid, road, "road_dist_m")
    first = small_grid["cell_id"].iloc[0]
    by_id = d.set_axis(small_grid["cell_id"])
    # centroid at x=500_500 -> 500 m from the road (the western-most cells)
    assert by_id.min() == pytest.approx(500.0, abs=1.0)
    assert by_id.max() == pytest.approx(3500.0, abs=1.0)
    assert d.name == "road_dist_m"
    assert first in by_id.index


def test_distance_to_nearest_handles_empty_lines(small_grid):
    empty = gpd.GeoDataFrame(geometry=[], crs=4326)
    d = static_features.distance_to_nearest_m(small_grid, empty, "river_dist_m")
    assert d.isna().all()


def test_assign_khg_by_centroid(small_grid):
    khg = gpd.GeoDataFrame(
        {"khg_id": ["KHG_A", "KHG_B"]},
        geometry=[
            box(500_000, 9_650_000, 502_000, 9_652_000),
            box(502_000, 9_650_000, 504_000, 9_652_000),
        ],
        crs=config.GRID_CRS,
    ).to_crs(4326)
    out = static_features.assign_khg(small_grid, khg)
    assert set(out.unique()) == {"KHG_A", "KHG_B"}
    assert (out == "KHG_A").sum() == 4


def test_assign_khg_outside_polygons_is_non_khg(small_grid):
    khg = gpd.GeoDataFrame(
        {"khg_id": ["KHG_A"]},
        geometry=[box(500_000, 9_650_000, 501_000, 9_651_000)],
        crs=config.GRID_CRS,
    ).to_crs(4326)
    out = static_features.assign_khg(small_grid, khg)
    assert (out == "NON_KHG").sum() == len(small_grid) - 1


def test_overlap_fraction_for_polygon_layers(small_grid):
    peat = gpd.GeoDataFrame(
        geometry=[box(500_000, 9_650_000, 500_500, 9_651_000)], crs=config.GRID_CRS
    ).to_crs(4326)
    out = static_features.polygon_cover_fraction(small_grid, peat, "peat_frac")
    assert out.max() == pytest.approx(0.5, abs=0.01)
    assert out.min() == 0.0
    assert out.name == "peat_frac"
    assert out.between(0, 1).all()
