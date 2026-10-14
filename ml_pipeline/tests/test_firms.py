"""Tests for NASA FIRMS URL building, parsing and hotspot-to-cell assignment."""

import io

import pandas as pd
import pytest

from jejak_pipeline import config, firms, grid

BBOX = (104.0, -4.5, 107.0, -2.0)

SAMPLE_CSV = """latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,bright_ti5,frp,daynight
-3.20000,105.10000,330.1,0.4,0.4,2023-09-01,0612,N,VIIRS,n,290.0,5.2,D
-3.21000,105.11000,340.2,0.4,0.4,2023-09-01,0612,N,VIIRS,h,291.0,9.9,D
-3.22000,105.12000,301.3,0.4,0.4,2023-09-02,1830,N,VIIRS,l,285.0,1.1,N
"""


def test_build_area_urls_chunks_into_5_day_ranges_inclusive():
    urls = firms.build_area_urls(
        "K" * 32, "VIIRS_SNPP_SP", BBOX, "2023-09-01", "2023-09-12"
    )
    # 12 days -> 5 + 5 + 2
    assert len(urls) == 3
    assert urls[0].endswith("/104.0,-4.5,107.0,-2.0/5/2023-09-01")
    assert urls[1].endswith("/5/2023-09-06")
    assert urls[2].endswith("/2/2023-09-11")
    assert all("/api/area/csv/" + "K" * 32 + "/VIIRS_SNPP_SP/" in u for u in urls)


def test_build_area_urls_single_day():
    urls = firms.build_area_urls(
        "K" * 32, "VIIRS_SNPP_SP", BBOX, "2023-09-01", "2023-09-01"
    )
    assert len(urls) == 1 and urls[0].endswith("/1/2023-09-01")


def test_build_area_urls_rejects_bad_input():
    with pytest.raises(ValueError):
        firms.build_area_urls(
            "short", "VIIRS_SNPP_SP", BBOX, "2023-01-01", "2023-01-02"
        )
    with pytest.raises(ValueError):
        firms.build_area_urls(
            "K" * 32, "VIIRS_SNPP_SP", BBOX, "2023-01-05", "2023-01-02"
        )


def test_parse_firms_csv_normalises_columns_and_types():
    df = firms.parse_firms_csv(io.StringIO(SAMPLE_CSV))
    assert list(df["confidence"]) == ["n", "h", "l"]
    assert pd.api.types.is_datetime64_any_dtype(df["acq_date"])
    assert df["frp"].dtype.kind == "f"
    assert {"latitude", "longitude", "acq_date", "confidence", "frp"} <= set(df.columns)


def test_filter_confidence_drops_low():
    df = firms.parse_firms_csv(io.StringIO(SAMPLE_CSV))
    kept = firms.filter_confidence(df, min_confidence="n")
    assert list(kept["confidence"]) == ["n", "h"]
    all_kept = firms.filter_confidence(df, min_confidence="l")
    assert len(all_kept) == 3


def test_hotspots_to_cells_adds_cell_id_matching_grid():
    df = firms.parse_firms_csv(io.StringIO(SAMPLE_CSV))
    out = firms.hotspots_to_cells(df)
    assert out["cell_id"].str.startswith(config.CELL_ID_PREFIX).all()
    expected = grid.cell_ids_for_lonlat(df["longitude"], df["latitude"])
    assert list(out["cell_id"]) == list(expected)


def test_parse_firms_csv_empty_response_gives_empty_frame():
    df = firms.parse_firms_csv(io.StringIO(""))
    assert len(df) == 0
    assert "acq_date" in df.columns


def test_fetch_firms_uses_injected_getter_and_concatenates():
    calls = []

    def fake_get(url: str) -> str:
        calls.append(url)
        # distinct rows per chunk so nothing is deduplicated
        return SAMPLE_CSV.replace("2023-09-0", f"2023-0{len(calls)}-0")

    df = firms.fetch_firms(
        "K" * 32, "VIIRS_SNPP_SP", BBOX, "2023-09-01", "2023-09-07", get=fake_get
    )
    assert len(calls) == 2
    assert len(df) == 6


def test_fetch_firms_error_message_does_not_leak_map_key():
    def bad_get(url: str) -> str:
        return "Invalid MAP_KEY."

    with pytest.raises(firms.FirmsError) as exc:
        firms.fetch_firms(
            "K" * 32, "VIIRS_SNPP_SP", BBOX, "2023-09-01", "2023-09-02", get=bad_get
        )
    assert "K" * 32 not in str(exc.value)


def test_fetch_firms_deduplicates_overlapping_rows():
    def fake_get(url: str) -> str:
        return SAMPLE_CSV

    df = firms.fetch_firms(
        "K" * 32, "VIIRS_SNPP_SP", BBOX, "2023-09-01", "2023-09-10", get=fake_get
    )
    # same 3 rows returned by both chunks -> deduplicated
    assert len(df) == 3
