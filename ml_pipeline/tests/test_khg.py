"""Tests for KHG (Kesatuan Hidrologis Gambut) boundary derivation and assignment."""

import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import Polygon

from jejak_pipeline import static_features


def test_assign_khg_with_mock_polygons():
    # Two adjacent 1 km square cells
    grid = gpd.GeoDataFrame(
        {"cell_id": ["C1", "C2", "C3"]},
        geometry=[
            Polygon([(0, 0), (1000, 0), (1000, 1000), (0, 1000)]),
            Polygon([(1000, 0), (2000, 0), (2000, 1000), (1000, 1000)]),
            Polygon([(2000, 0), (3000, 0), (3000, 1000), (2000, 1000)]),
        ],
        crs="EPSG:32748",
    )

    # KHG polygon covering C1 only
    khg = gpd.GeoDataFrame(
        {"khg_id": ["KHG_SUGIHAN_LUMPUR"]},
        geometry=[Polygon([(-10, -10), (1010, -10), (1010, 1010), (-10, 1010)])],
        crs="EPSG:32748",
    )

    series = static_features.assign_khg(grid, khg)
    assert series.tolist() == ["KHG_SUGIHAN_LUMPUR", "NON_KHG", "NON_KHG"]


def test_assign_khg_empty_returns_non_khg():
    grid = gpd.GeoDataFrame(
        {"cell_id": ["C1"]},
        geometry=[Polygon([(0, 0), (1000, 0), (1000, 1000), (0, 1000)])],
        crs="EPSG:32748",
    )
    khg = gpd.GeoDataFrame(columns=["khg_id", "geometry"], crs="EPSG:32748")
    series = static_features.assign_khg(grid, khg)
    assert series.tolist() == ["NON_KHG"]
