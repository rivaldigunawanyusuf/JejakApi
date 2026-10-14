"""Tests for the deterministic 1 km analysis grid."""

import geopandas as gpd
import pytest
from shapely.geometry import box

from jejak_pipeline import config, grid


@pytest.fixture
def boundary():
    # ~ 10 x 6 km rectangle in UTM 48S, expressed in EPSG:4326 via reprojection
    rect = gpd.GeoDataFrame(
        {"name": ["test"]},
        geometry=[box(500_000, 9_650_000, 510_000, 9_656_000)],
        crs=config.GRID_CRS,
    )
    return rect.to_crs(4326)


def test_grid_cells_are_1km_squares(boundary):
    g = grid.build_grid(boundary)
    assert len(g) == 60
    areas = g.geometry.area
    assert areas.between(999_999, 1_000_001).all()


def test_grid_is_in_projected_crs(boundary):
    g = grid.build_grid(boundary)
    assert g.crs.to_string() == config.GRID_CRS


def test_cell_ids_are_unique_and_stable(boundary):
    g1 = grid.build_grid(boundary)
    g2 = grid.build_grid(boundary)
    assert g1["cell_id"].is_unique
    assert list(g1["cell_id"]) == list(g2["cell_id"])
    assert g1["cell_id"].str.startswith("OKI_GRID_").all()


def test_cell_id_depends_only_on_position_not_on_boundary(boundary):
    # A smaller boundary must give the same ids for the same physical cells.
    small = gpd.GeoDataFrame(
        geometry=[box(500_000, 9_650_000, 503_000, 9_653_000)], crs=config.GRID_CRS
    ).to_crs(4326)
    big = grid.build_grid(boundary).set_index("cell_id")
    sm = grid.build_grid(small).set_index("cell_id")
    assert set(sm.index) <= set(big.index)


def test_grid_has_wgs84_centroids(boundary):
    g = grid.build_grid(boundary)
    assert {"lon", "lat"} <= set(g.columns)
    assert g["lon"].between(104.0, 107.5).all()
    assert g["lat"].between(-5.0, -1.5).all()


def test_partial_cells_clipped_by_boundary_are_kept_if_centroid_inside():
    # Boundary that cuts a cell in half: keep cell only if centroid inside
    b = gpd.GeoDataFrame(
        geometry=[box(500_000, 9_650_000, 501_400, 9_651_000)], crs=config.GRID_CRS
    ).to_crs(4326)
    g = grid.build_grid(b)
    # cells at x=[500k,501k] (centroid 500.5k inside) and [501k,502k] (centroid 501.5k outside)
    assert len(g) == 1


def test_grid_to_wgs84_geometry_roundtrip(boundary):
    g = grid.build_grid(boundary)
    wgs = grid.to_wgs84(g)
    assert wgs.crs.to_epsg() == 4326
    assert len(wgs) == len(g)


def test_cell_ids_for_lonlat_match_grid_cells(boundary):
    g = grid.build_grid(boundary)
    ids = grid.cell_ids_for_lonlat(g["lon"], g["lat"])
    assert list(ids) == list(g["cell_id"])


def test_cell_ids_for_lonlat_outside_envelope_raises():
    with pytest.raises(ValueError):
        grid.cell_ids_for_lonlat([120.0], [-3.0])
