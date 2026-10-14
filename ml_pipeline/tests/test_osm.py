"""Tests for OpenStreetMap (Overpass) roads / waterways extraction."""

import pytest

from jejak_pipeline import osm

BBOX = (104.0, -4.5, 107.0, -2.0)

SAMPLE = {
    "elements": [
        {
            "type": "way",
            "id": 1,
            "tags": {"highway": "primary"},
            "geometry": [
                {"lat": -3.0, "lon": 105.0},
                {"lat": -3.1, "lon": 105.1},
            ],
        },
        {
            "type": "way",
            "id": 2,
            "tags": {"waterway": "river"},
            "geometry": [
                {"lat": -3.2, "lon": 105.2},
                {"lat": -3.3, "lon": 105.3},
                {"lat": -3.4, "lon": 105.4},
            ],
        },
        {"type": "node", "id": 3, "lat": -3.0, "lon": 105.0},
        {"type": "way", "id": 4, "tags": {"highway": "track"}, "geometry": []},
        {
            "type": "way",
            "id": 5,
            "tags": {"highway": "track"},
            "geometry": [{"lat": -3.0, "lon": 105.0}],
        },
    ]
}


def test_roads_query_contains_bbox_in_overpass_order_and_geom():
    q = osm.build_overpass_query(BBOX, "roads")
    # Overpass bbox order is (south, west, north, east)
    assert "(-4.5,104.0,-2.0,107.0)" in q
    assert '"highway"' in q
    assert "out geom" in q
    assert "[out:json]" in q


def test_waterways_query_targets_waterway_tag():
    q = osm.build_overpass_query(BBOX, "waterways")
    assert '"waterway"' in q
    assert "river" in q and "canal" in q


def test_unknown_kind_rejected():
    with pytest.raises(ValueError):
        osm.build_overpass_query(BBOX, "buildings")


def test_parse_ways_builds_linestrings_and_skips_degenerate():
    gdf = osm.parse_overpass_ways(SAMPLE)
    assert len(gdf) == 2  # node, empty geometry and single-point way are skipped
    assert set(gdf["osm_id"]) == {1, 2}
    assert gdf.crs.to_epsg() == 4326
    assert gdf.geometry.geom_type.eq("LineString").all()
    row = gdf[gdf["osm_id"] == 2].iloc[0]
    assert len(row.geometry.coords) == 3
    # lon, lat order
    assert row.geometry.coords[0] == (105.2, -3.2)


def test_parse_ways_keeps_feature_class():
    gdf = osm.parse_overpass_ways(SAMPLE)
    classes = dict(zip(gdf["osm_id"], gdf["feature_class"]))
    assert classes == {1: "primary", 2: "river"}


def test_parse_ways_empty_response():
    gdf = osm.parse_overpass_ways({"elements": []})
    assert len(gdf) == 0
    assert gdf.crs.to_epsg() == 4326
    assert "osm_id" in gdf.columns


def test_split_bbox_tiles_cover_original_without_gaps():
    tiles = osm.split_bbox(BBOX, nx=3, ny=2)
    assert len(tiles) == 6
    assert min(t[0] for t in tiles) == BBOX[0]
    assert min(t[1] for t in tiles) == BBOX[1]
    assert max(t[2] for t in tiles) == pytest.approx(BBOX[2])
    assert max(t[3] for t in tiles) == pytest.approx(BBOX[3])
    area = sum((t[2] - t[0]) * (t[3] - t[1]) for t in tiles)
    assert area == pytest.approx((BBOX[2] - BBOX[0]) * (BBOX[3] - BBOX[1]))


def test_fetch_ways_merges_tiles_and_deduplicates_ids():
    def fake_post(query: str) -> dict:
        return SAMPLE

    gdf = osm.fetch_ways(BBOX, "roads", nx=2, ny=2, post=fake_post)
    assert len(gdf) == 2  # same ways returned by 4 tiles -> deduplicated


def test_fetch_hot_osm_invalid_kind():
    with pytest.raises(ValueError, match="kind must be one of"):
        osm.fetch_hot_osm("buildings")


def test_fetch_hot_osm_mocked(monkeypatch):
    import pandas as pd
    import shapely

    line = shapely.LineString([(105.0, -3.0), (105.1, -3.1)])
    wkb_bytes = shapely.to_wkb(line)

    mock_df = pd.DataFrame(
        {
            "osm_id": ["way/123"],
            "feature_class": ["primary"],
            "geom": [list(wkb_bytes)],
        }
    )

    class MockDuckDBCon:
        def execute(self, sql):
            return self

        def fetchdf(self):
            return mock_df

        def close(self):
            pass

    gdf = osm.fetch_hot_osm("roads", con=MockDuckDBCon())
    assert len(gdf) == 1
    assert gdf["osm_id"].iloc[0] == "way/123"
    assert gdf["feature_class"].iloc[0] == "primary"
    assert gdf.crs.to_epsg() == 4326
    assert gdf.geometry.iloc[0].geom_type == "LineString"


def test_fetch_hot_osm_empty():
    import pandas as pd

    empty_df = pd.DataFrame(columns=["osm_id", "feature_class", "geom"])

    class MockDuckDBCon:
        def execute(self, sql):
            return self

        def fetchdf(self):
            return empty_df

        def close(self):
            pass

    gdf = osm.fetch_hot_osm("roads", con=MockDuckDBCon())
    assert len(gdf) == 0
    assert "osm_id" in gdf.columns
    assert "feature_class" in gdf.columns
    assert gdf.crs.to_epsg() == 4326
