"""Tests for multi-window features (no look-ahead) and 30-day labels."""

import numpy as np
import pandas as pd
import pytest

from jejak_pipeline import labels, windows


@pytest.fixture
def daily():
    idx = pd.date_range("2022-01-01", periods=500, freq="D")
    return pd.DataFrame({"A": np.ones(500), "B": np.zeros(500)}, index=idx)


def test_window_sums_basic_counts(daily):
    t0 = pd.Timestamp("2023-01-05")  # 369 days after start, full history exists
    out = windows.window_sums(daily, [t0], ((0, 30), (30, 90), (90, 365)), "clear")
    row = out[out["cell_id"] == "A"].iloc[0]
    assert row["clear_w0_30"] == 30
    assert row["clear_w30_90"] == 60
    assert row["clear_w90_365"] == 275


def test_window_sums_ignore_future_values(daily):
    t0 = pd.Timestamp("2023-01-05")
    spiked = daily.copy()
    spiked.loc[t0 + pd.Timedelta(days=1) :, "B"] = 1000.0
    out = windows.window_sums(spiked, [t0], ((0, 30),), "clear")
    assert out.loc[out["cell_id"] == "B", "clear_w0_30"].iloc[0] == 0.0


def test_window_sums_include_issue_date_itself_but_not_after(daily):
    t0 = pd.Timestamp("2022-06-01")
    only_t0 = daily * 0.0
    only_t0.loc[t0, "A"] = 5.0
    out = windows.window_sums(only_t0, [t0], ((0, 30),), "x")
    assert out.loc[out["cell_id"] == "A", "x_w0_30"].iloc[0] == 5.0


def test_window_sums_incomplete_history_is_nan(daily):
    t0 = pd.Timestamp("2022-02-15")  # only ~45 days of history
    out = windows.window_sums(daily, [t0], ((0, 30), (90, 365)), "clear")
    row = out[out["cell_id"] == "A"].iloc[0]
    assert row["clear_w0_30"] == 30
    assert np.isnan(row["clear_w90_365"])


def test_window_sums_output_keys(daily):
    t0s = [pd.Timestamp("2023-01-05"), pd.Timestamp("2023-01-12")]
    out = windows.window_sums(daily, t0s, ((0, 30),), "clear")
    assert len(out) == 4  # 2 cells x 2 issue dates
    assert {"cell_id", "issue_date"} <= set(out.columns)


def test_daily_counts_from_events():
    hs = pd.DataFrame(
        {
            "cell_id": ["A", "A", "B"],
            "acq_date": pd.to_datetime(["2023-01-02", "2023-01-02", "2023-01-04"]),
        }
    )
    dc = labels.daily_counts(hs, ["A", "B", "C"], "2023-01-01", "2023-01-05")
    assert list(dc.columns) == ["A", "B", "C"]
    assert dc.loc["2023-01-02", "A"] == 2
    assert dc.loc["2023-01-04", "B"] == 1
    assert dc["C"].sum() == 0
    assert len(dc) == 5


def test_label_uses_only_future_window_exclusive_of_t0():
    idx = pd.date_range("2023-01-01", periods=100, freq="D")
    counts = pd.DataFrame(0, index=idx, columns=["A", "B"])
    t0 = pd.Timestamp("2023-02-01")
    counts.loc[t0, "A"] = 3  # on t0 -> NOT in label window
    counts.loc[t0 + pd.Timedelta(days=30), "B"] = 1  # last day in window
    out = labels.label_horizon(counts, [t0], horizon=30)
    lab = out.set_index("cell_id")["label_30d"]
    assert lab["A"] == 0
    assert lab["B"] == 1


def test_label_event_after_horizon_not_counted():
    idx = pd.date_range("2023-01-01", periods=100, freq="D")
    counts = pd.DataFrame(0, index=idx, columns=["A"])
    t0 = pd.Timestamp("2023-02-01")
    counts.loc[t0 + pd.Timedelta(days=31), "A"] = 1
    out = labels.label_horizon(counts, [t0], horizon=30)
    assert out["label_30d"].iloc[0] == 0


def test_label_drops_censored_issue_dates():
    idx = pd.date_range("2023-01-01", periods=40, freq="D")
    counts = pd.DataFrame(0, index=idx, columns=["A"])
    ok = pd.Timestamp("2023-01-05")
    censored = pd.Timestamp("2023-02-05")  # t0 + 30 beyond end of data
    out = labels.label_horizon(counts, [ok, censored], horizon=30)
    assert list(out["issue_date"].unique()) == [ok]


def test_label_is_int8_binary():
    idx = pd.date_range("2023-01-01", periods=60, freq="D")
    counts = pd.DataFrame(5, index=idx, columns=["A"])
    out = labels.label_horizon(counts, [pd.Timestamp("2023-01-10")], horizon=30)
    assert out["label_30d"].dtype == np.int8
    assert set(out["label_30d"].unique()) <= {0, 1}
    assert out["n_hotspots_30d"].iloc[0] == 150
