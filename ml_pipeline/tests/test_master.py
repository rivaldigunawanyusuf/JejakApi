"""Tests for master dataset assembly and contract validation."""

import numpy as np
import pandas as pd
import pytest

from jejak_pipeline import master


def _valid_master(n_cells=3, n_dates=2) -> pd.DataFrame:
    dates = pd.to_datetime(["2023-08-01", "2023-08-08"])[:n_dates]
    rows = []
    for c in range(n_cells):
        for d in dates:
            rows.append(
                {
                    "cell_id": f"OKI_GRID_{c:05d}",
                    "issue_date": d,
                    "khg_id": "KHG_A" if c < 2 else "NON_KHG",
                    "lon": 105.0 + c * 0.01,
                    "lat": -3.2,
                    "dc": 400.0,
                    "dmc": 80.0,
                    "label_30d": np.int8(c % 2),
                    "feature_acquired_at": d - pd.Timedelta(days=1),
                }
            )
    return pd.DataFrame(rows)


def test_valid_master_passes():
    master.validate_master(_valid_master())


def test_missing_required_column_fails():
    df = _valid_master().drop(columns=["khg_id"])
    with pytest.raises(master.MasterValidationError, match="khg_id"):
        master.validate_master(df)


def test_duplicate_key_fails():
    df = pd.concat([_valid_master(), _valid_master().iloc[:1]], ignore_index=True)
    with pytest.raises(master.MasterValidationError, match="duplicate"):
        master.validate_master(df)


def test_label_must_be_binary():
    df = _valid_master()
    df.loc[0, "label_30d"] = 2
    with pytest.raises(master.MasterValidationError, match="label_30d"):
        master.validate_master(df)


def test_temporal_leakage_detected():
    df = _valid_master()
    df.loc[0, "feature_acquired_at"] = df.loc[0, "issue_date"] + pd.Timedelta(days=1)
    with pytest.raises(master.MasterValidationError, match="leakage"):
        master.validate_master(df)


def test_lonlat_outside_oki_fails():
    df = _valid_master()
    df.loc[0, "lon"] = 120.0
    with pytest.raises(master.MasterValidationError, match="bbox"):
        master.validate_master(df)


def test_nulls_in_key_columns_fail():
    df = _valid_master()
    df.loc[0, "cell_id"] = None
    with pytest.raises(master.MasterValidationError, match="null"):
        master.validate_master(df)


def test_assemble_merges_static_dynamic_and_labels():
    cells = pd.DataFrame(
        {
            "cell_id": ["A", "B"],
            "lon": [105.0, 105.1],
            "lat": [-3.0, -3.1],
            "khg_id": ["K1", "K2"],
            "canal_density_km_km2": [1.0, 0.0],
        }
    )
    dates = pd.to_datetime(["2023-08-01"])
    dynamic = pd.DataFrame(
        {
            "cell_id": ["A", "B"],
            "issue_date": [dates[0]] * 2,
            "dc": [300.0, 310.0],
            "dmc": [60.0, 61.0],
            "feature_acquired_at": [dates[0] - pd.Timedelta(days=1)] * 2,
        }
    )
    lab = pd.DataFrame(
        {
            "cell_id": ["A", "B"],
            "issue_date": [dates[0]] * 2,
            "label_30d": np.array([1, 0], dtype=np.int8),
            "n_hotspots_30d": [4, 0],
        }
    )
    out = master.assemble(cells, dynamic, lab)
    assert len(out) == 2
    assert {"canal_density_km_km2", "dc", "label_30d", "khg_id"} <= set(out.columns)
    master.validate_master(out)


def test_assemble_drops_rows_without_label():
    cells = pd.DataFrame(
        {"cell_id": ["A"], "lon": [105.0], "lat": [-3.0], "khg_id": ["K1"]}
    )
    d1, d2 = pd.to_datetime(["2023-08-01", "2023-09-01"])
    dynamic = pd.DataFrame(
        {
            "cell_id": ["A", "A"],
            "issue_date": [d1, d2],
            "dc": [1.0, 2.0],
            "dmc": [1.0, 2.0],
            "feature_acquired_at": [d1, d2],
        }
    )
    lab = pd.DataFrame(
        {
            "cell_id": ["A"],
            "issue_date": [d1],
            "label_30d": np.array([0], dtype=np.int8),
            "n_hotspots_30d": [0],
        }
    )
    out = master.assemble(cells, dynamic, lab)
    assert list(out["issue_date"]) == [d1]


def test_write_and_read_parquet_roundtrip(tmp_path):
    df = _valid_master()
    path = tmp_path / "oki_master.parquet"
    master.write_parquet(df, path)
    back = pd.read_parquet(path)
    pd.testing.assert_frame_equal(
        back.sort_values(["cell_id", "issue_date"]).reset_index(drop=True),
        df.sort_values(["cell_id", "issue_date"]).reset_index(drop=True),
        check_dtype=False,
    )
