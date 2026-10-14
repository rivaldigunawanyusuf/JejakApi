"""Tests for Canadian FWI System drought codes (DMC / DC) used as features."""

import numpy as np
import pandas as pd
import pytest

from jejak_pipeline import fwi


def test_rh_from_dewpoint_saturated_is_100():
    assert fwi.rh_from_dewpoint(25.0, 25.0) == pytest.approx(100.0, abs=0.01)


def test_rh_from_dewpoint_bounded_and_decreasing_with_spread():
    wet = fwi.rh_from_dewpoint(30.0, 26.0)
    dry = fwi.rh_from_dewpoint(30.0, 15.0)
    assert 0.0 < dry < wet <= 100.0


def test_kelvin_to_celsius():
    assert fwi.kelvin_to_celsius(273.15) == pytest.approx(0.0)


def test_dc_no_rain_matches_hand_calculation():
    # V = 0.36 * (17 + 2.8) + 1.4 = 8.528 ; DC = 15 + 0.5 * V
    dc = fwi.update_dc(dc_prev=15.0, temp=17.0, rain=0.0, lf=1.4)
    assert dc == pytest.approx(19.264, abs=1e-6)


def test_dmc_no_rain_matches_hand_calculation():
    # K = 1.894 * (17+1.1) * (100-42) * 9.0 * 1e-6 ; DMC = 6 + 100 * K
    dmc = fwi.update_dmc(dmc_prev=6.0, temp=17.0, rh=42.0, rain=0.0, le=9.0)
    assert dmc == pytest.approx(7.78949, abs=1e-4)


def test_heavy_rain_reduces_codes():
    dc_dry = fwi.update_dc(300.0, 30.0, 0.0, 1.4)
    dc_wet = fwi.update_dc(300.0, 30.0, 80.0, 1.4)
    assert dc_wet < dc_dry
    dmc_dry = fwi.update_dmc(80.0, 30.0, 60.0, 0.0, 9.0)
    dmc_wet = fwi.update_dmc(80.0, 30.0, 60.0, 80.0, 9.0)
    assert dmc_wet < dmc_dry


def test_codes_never_negative():
    assert fwi.update_dc(1.0, 20.0, 500.0, 1.4) >= 0.0
    assert fwi.update_dmc(1.0, 20.0, 80.0, 500.0, 9.0) >= 0.0


def test_light_rain_below_threshold_is_ignored():
    assert fwi.update_dc(100.0, 28.0, 2.0, 1.4) == fwi.update_dc(100.0, 28.0, 0.0, 1.4)
    assert fwi.update_dmc(40.0, 28.0, 70.0, 1.0, 9.0) == fwi.update_dmc(
        40.0, 28.0, 70.0, 0.0, 9.0
    )


def test_compute_drought_codes_is_vectorised_and_monotonic_in_dry_spell():
    n_cells, n_days = 3, 60
    temp = np.full((n_cells, n_days), 30.0)
    rh = np.full((n_cells, n_days), 60.0)
    rain = np.zeros((n_cells, n_days))
    dmc, dc = fwi.compute_drought_codes(temp, rh, rain)
    assert dmc.shape == dc.shape == (n_cells, n_days)
    assert np.all(np.diff(dc, axis=1) > 0)
    assert np.all(np.diff(dmc, axis=1) > 0)


def test_compute_drought_codes_rain_event_drops_dc():
    temp = np.full((1, 40), 30.0)
    rh = np.full((1, 40), 60.0)
    rain = np.zeros((1, 40))
    rain[0, 30] = 100.0
    _, dc = fwi.compute_drought_codes(temp, rh, rain)
    assert dc[0, 30] < dc[0, 29]


def test_precip_deficit_30d():
    dates = pd.date_range("2023-01-01", periods=40)
    rain = pd.Series(np.full(40, 2.0), index=dates)
    deficit = fwi.rain_deficit(rain, window=30, normal_per_window=150.0)
    # 30 days * 2 mm = 60 mm vs normal 150 mm -> deficit 90 mm at day 30
    assert deficit.iloc[29] == pytest.approx(90.0)
    assert np.isnan(deficit.iloc[0])
