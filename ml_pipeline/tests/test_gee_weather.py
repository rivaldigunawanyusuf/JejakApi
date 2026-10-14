"""Tests for weather pipeline and offline FWI feature generation."""

import numpy as np
import pandas as pd
import pytest

from jejak_pipeline import fwi


def _synthetic_daily_weather(n_cells=5, n_days=60):
    dates = pd.date_range("2023-07-01", periods=n_days, freq="D")
    cell_ids = [f"OKI_GRID_{i:05d}" for i in range(n_cells)]
    records = []
    for d in dates:
        for cid in cell_ids:
            records.append(
                {
                    "cell_id": cid,
                    "date": d,
                    "temp_c": 28.5 + (np.sin(d.dayofyear / 10.0)),
                    "rh_pct": 75.0 - (np.cos(d.dayofyear / 10.0) * 15.0),
                    "rain_mm": 2.5 if d.day % 7 == 0 else 0.0,
                }
            )
    return pd.DataFrame(records)


def test_process_weather_computes_dmc_and_dc_for_all_cells():
    df = _synthetic_daily_weather(n_cells=3, n_days=30)
    pivot_temp = df.pivot(index="cell_id", columns="date", values="temp_c").values
    pivot_rh = df.pivot(index="cell_id", columns="date", values="rh_pct").values
    pivot_rain = df.pivot(index="cell_id", columns="date", values="rain_mm").values

    dmc, dc = fwi.compute_drought_codes(pivot_temp, pivot_rh, pivot_rain)
    assert dmc.shape == (3, 30)
    assert dc.shape == (3, 30)
    assert not np.isnan(dmc).any()
    assert not np.isnan(dc).any()
    assert (dmc >= 0).all()
    assert (dc >= 0).all()


def test_rain_deficit_rolling_calculation():
    dates = pd.date_range("2023-01-01", periods=45, freq="D")
    rain_series = pd.Series(1.0, index=dates)  # 1 mm/day
    deficit = fwi.rain_deficit(rain_series, window=30, normal_per_window=100.0)
    # At day 30: 30 days * 1mm = 30mm. Normal 100mm -> deficit = 70mm
    assert deficit.iloc[29] == pytest.approx(70.0)
    assert np.isnan(deficit.iloc[0])
