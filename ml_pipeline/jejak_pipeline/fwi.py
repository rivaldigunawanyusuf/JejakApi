"""Canadian Forest Fire Weather Index (FWI) System drought codes.

Implements the Duff Moisture Code (DMC) and Drought Code (DC) daily updates of
Van Wagner (1987), with the equatorial day-length constants used by cffdrs.

Note: ERA5-Land does not provide DMC/DC natively. They are derived offline from
ERA5-Land temperature, dew point and precipitation (see ADR-004). We use daily
aggregated values rather than local-noon observations, which is a documented
approximation for tropical peatlands.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from . import config

_RAIN_THRESHOLD_DMC = 1.5  # mm
_RAIN_THRESHOLD_DC = 2.8  # mm


def kelvin_to_celsius(kelvin):
    """Convert Kelvin to degrees Celsius."""
    return kelvin - 273.15


def rh_from_dewpoint(temp_c, dewpoint_c):
    """Relative humidity (%) from air and dew point temperature (Magnus formula)."""
    a, b = 17.625, 243.04
    es = np.exp(a * np.asarray(temp_c, dtype=float) / (b + temp_c))
    e = np.exp(a * np.asarray(dewpoint_c, dtype=float) / (b + dewpoint_c))
    rh = 100.0 * e / es
    return np.clip(rh, 0.0, 100.0) if np.ndim(rh) else float(np.clip(rh, 0.0, 100.0))


def update_dmc(dmc_prev, temp, rh, rain, le=config.DMC_DAYLENGTH_EQUATORIAL):
    """One-day Duff Moisture Code update (works on scalars and numpy arrays)."""
    dmc_prev = np.asarray(dmc_prev, dtype=float)
    temp = np.maximum(np.asarray(temp, dtype=float), -1.1)
    rh = np.clip(np.asarray(rh, dtype=float), 0.0, 100.0)
    rain = np.asarray(rain, dtype=float)

    safe_prev = np.maximum(dmc_prev, 1e-6)
    re = np.where(rain > _RAIN_THRESHOLD_DMC, 0.92 * rain - 1.27, 0.0)
    mo = 20.0 + np.exp(5.6348 - dmc_prev / 43.43)
    b = np.where(
        dmc_prev <= 33.0,
        100.0 / (0.5 + 0.3 * dmc_prev),
        np.where(
            dmc_prev <= 65.0,
            14.0 - 1.3 * np.log(safe_prev),
            6.2 * np.log(safe_prev) - 17.2,
        ),
    )
    mr = mo + 1000.0 * re / (48.77 + b * re)
    pr = np.maximum(244.72 - 43.43 * np.log(np.maximum(mr - 20.0, 1e-6)), 0.0)
    after_rain = np.where(rain > _RAIN_THRESHOLD_DMC, pr, dmc_prev)

    k = 1.894 * (temp + 1.1) * (100.0 - rh) * le * 1e-6
    result = after_rain + 100.0 * k
    return result if result.ndim else float(result)


def update_dc(dc_prev, temp, rain, lf=config.DC_DAYLENGTH_EQUATORIAL):
    """One-day Drought Code update (works on scalars and numpy arrays)."""
    dc_prev = np.asarray(dc_prev, dtype=float)
    temp = np.maximum(np.asarray(temp, dtype=float), -2.8)
    rain = np.asarray(rain, dtype=float)

    rd = np.where(rain > _RAIN_THRESHOLD_DC, 0.83 * rain - 1.27, 0.0)
    qo = 800.0 * np.exp(-dc_prev / 400.0)
    qr = qo + 3.937 * rd
    dr = np.maximum(400.0 * np.log(800.0 / qr), 0.0)
    after_rain = np.where(rain > _RAIN_THRESHOLD_DC, dr, dc_prev)

    v = np.maximum(0.36 * (temp + 2.8) + lf, 0.0)
    result = after_rain + 0.5 * v
    return result if result.ndim else float(result)


def compute_drought_codes(
    temp: np.ndarray,
    rh: np.ndarray,
    rain: np.ndarray,
    dmc0: float = config.DMC_INITIAL,
    dc0: float = config.DC_INITIAL,
) -> tuple[np.ndarray, np.ndarray]:
    """Compute DMC and DC over time for many cells at once.

    Args:
        temp: Daily temperature in degrees Celsius, shape ``(n_cells, n_days)``.
        rh: Daily relative humidity in %, same shape.
        rain: Daily precipitation in mm, same shape.
        dmc0: DMC value before the first day (spin-up start).
        dc0: DC value before the first day (spin-up start).

    Returns:
        Tuple ``(dmc, dc)`` each of shape ``(n_cells, n_days)``. Day ``j`` values
        use only meteorology up to and including day ``j`` (no look-ahead).
    """
    temp, rh, rain = (np.asarray(a, dtype=float) for a in (temp, rh, rain))
    if not (temp.shape == rh.shape == rain.shape) or temp.ndim != 2:
        raise ValueError("temp, rh and rain must share the same 2D shape")
    n_cells, n_days = temp.shape
    dmc = np.empty((n_cells, n_days))
    dc = np.empty((n_cells, n_days))
    dmc_prev = np.full(n_cells, dmc0)
    dc_prev = np.full(n_cells, dc0)
    for j in range(n_days):
        dmc_prev = update_dmc(dmc_prev, temp[:, j], rh[:, j], rain[:, j])
        dc_prev = update_dc(dc_prev, temp[:, j], rain[:, j])
        dmc[:, j] = dmc_prev
        dc[:, j] = dc_prev
    return dmc, dc


def rain_deficit(
    rain: pd.Series, window: int = 30, normal_per_window: float | None = None
) -> pd.Series:
    """Rolling precipitation deficit (mm) versus a climatological normal.

    ``deficit = normal_per_window - rolling_sum(rain, window)``; positive means
    drier than normal. The first ``window - 1`` values are NaN (incomplete window).
    """
    if normal_per_window is None:
        raise ValueError("normal_per_window must be provided")
    rolled = rain.rolling(window=window, min_periods=window).sum()
    return normal_per_window - rolled
