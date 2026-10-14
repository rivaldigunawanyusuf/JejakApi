"""Tests for analytical tile indexing in Dadap et al. canal archive."""

import pytest
from jejak_pipeline import canals


def test_tiles_for_bbox_calculates_correct_indices():
    # Tile L15-1566E-1050N.tif:
    # bounds: left=10605790.54715801, bottom=508764.8602017291,
    #         right=10625358.426396297, top=528332.7394400164
    # in WGS84: approx lon 95.27 .. 95.45, lat 4.56 .. 4.74
    bbox = (95.3, 4.6, 95.4, 4.7)
    tiles = canals.tile_names_for_bbox(bbox)
    assert "geotiffs/L15-1566E-1050N.tif" in tiles


def test_tiles_for_bbox_returns_sorted_unique():
    bbox = (104.5, -3.5, 105.0, -3.0)
    tiles = canals.tile_names_for_bbox(bbox)
    assert len(tiles) > 0
    assert tiles == sorted(set(tiles))
    for t in tiles:
        assert t.startswith("geotiffs/L15-")
        assert t.endswith(".tif")
