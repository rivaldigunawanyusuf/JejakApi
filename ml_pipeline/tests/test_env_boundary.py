"""Tests for .env loading and boundary helpers."""

import geopandas as gpd
import pytest
from shapely.geometry import box

from jejak_pipeline import boundary, env


def test_parse_env_text_handles_comments_quotes_and_blank_lines():
    text = """
# comment
GEE_PROJECT=my-project
FIRMS_MAP_KEY="abc123"
EMPTY=
export QUOTED='x y'
   SPACED = value  
bad line without equals
"""
    out = env.parse_env_text(text)
    assert out["GEE_PROJECT"] == "my-project"
    assert out["FIRMS_MAP_KEY"] == "abc123"
    assert out["EMPTY"] == ""
    assert out["QUOTED"] == "x y"
    assert out["SPACED"] == "value"
    assert "bad line without equals" not in out


def test_load_env_does_not_override_existing_environment(tmp_path, monkeypatch):
    f = tmp_path / ".env"
    f.write_text("JEJAK_TEST_A=from_file\nJEJAK_TEST_B=from_file\n")
    monkeypatch.setenv("JEJAK_TEST_A", "from_env")
    monkeypatch.delenv("JEJAK_TEST_B", raising=False)
    env.load_env(f)
    import os

    assert os.environ["JEJAK_TEST_A"] == "from_env"
    assert os.environ["JEJAK_TEST_B"] == "from_file"


def test_load_env_missing_file_is_noop(tmp_path):
    env.load_env(tmp_path / "nope.env")


def test_require_raises_helpful_error_without_value(monkeypatch):
    monkeypatch.delenv("JEJAK_NOT_SET", raising=False)
    with pytest.raises(env.MissingSettingError, match="JEJAK_NOT_SET"):
        env.require("JEJAK_NOT_SET")


def test_bbox_from_boundary_applies_buffer():
    gdf = gpd.GeoDataFrame(geometry=[box(105.0, -4.0, 106.0, -3.0)], crs=4326)
    assert boundary.bbox_from_boundary(gdf, buffer_deg=0.1) == pytest.approx(
        (104.9, -4.1, 106.1, -2.9)
    )


def test_bbox_from_boundary_reprojects_to_wgs84():
    gdf = gpd.GeoDataFrame(
        geometry=[box(500_000, 9_650_000, 510_000, 9_660_000)], crs="EPSG:32748"
    )
    w, s, e, n = boundary.bbox_from_boundary(gdf, buffer_deg=0.0)
    assert 104.9 < w < 105.1 and 105.0 < e < 105.2
    assert -3.3 < s < -3.0 and n > s


def test_filter_regency_matches_case_insensitive():
    df = gpd.GeoDataFrame(
        {
            "ADM2_EN": ["Ogan Komering Ilir", "Ogan Ilir", "Banyuasin"],
            "ADM1_EN": ["Sumatera Selatan", "Sumatera Selatan", "Sumatera Selatan"],
        },
        geometry=[box(1, 1, 2, 2), box(2, 2, 3, 3), box(3, 3, 4, 4)],
        crs=4326,
    )
    oki = boundary.filter_regency(df, "Ogan Komering Ilir")
    assert len(oki) == 1
    assert oki["ADM2_EN"].iloc[0] == "Ogan Komering Ilir"


def test_filter_regency_raises_if_not_found():
    df = gpd.GeoDataFrame(
        {"ADM2_EN": ["Banyuasin"]},
        geometry=[box(1, 1, 2, 2)],
        crs=4326,
    )
    with pytest.raises(ValueError, match="not found"):
        boundary.filter_regency(df, "Ogan Komering Ilir")

