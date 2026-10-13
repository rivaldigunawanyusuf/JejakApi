"""Google Earth Engine weather collection builder and offline FWI feature processing.

Variables extracted from GEE:
- ERA5-Land Daily Aggregated (``ECMWF/ERA5_LAND/DAILY_AGGR``):
  - ``temperature_2m`` (mean daily air temperature, Kelvin)
  - ``dewpoint_temperature_2m`` (mean daily dew point temperature, Kelvin)
  - ``total_precipitation_sum`` (total precipitation, metres -> mm)
- CHIRPS Daily (``UCSB-CHG/CHIRPS/DAILY``):
  - ``precipitation`` (daily rainfall, mm)

Features computed offline (ADR-004):
- Relative Humidity (%) via Magnus formula
- Duff Moisture Code (DMC) and Drought Code (DC) via equatorial cffdrs equations
- 30-day precipitation deficit vs normal
"""

from __future__ import annotations

import os
from collections.abc import Iterable
from pathlib import Path

import numpy as np
import pandas as pd

from . import env, fwi


def init_ee(project_id: str | None = None) -> None:
    """Initialize Earth Engine with user authentication and configured project.

    Reads ``GEE_PROJECT`` from ``.env`` if ``project_id`` is not explicitly passed.
    """
    try:
        import ee
    except ImportError as e:
        raise ImportError(
            "earthengine-api is not installed. Run `uv add earthengine-api`."
        ) from e

    env.load_env()
    proj = project_id or os.environ.get("GEE_PROJECT", "").strip()
    if not proj:
        raise env.MissingSettingError(
            "GEE_PROJECT is not set in .env. "
            "Please add GEE_PROJECT=your-cloud-project-id to .env."
        )

    try:
        ee.Initialize(project=proj)
    except Exception as exc:
        raise RuntimeError(
            f"Failed to initialize Earth Engine with project {proj!r}. "
            "Make sure you have authenticated by running `earthengine authenticate`."
        ) from exc


def get_weather_image_collection(start_date: str, end_date: str):
    """Build joined daily ERA5-Land and CHIRPS ImageCollection on GEE server."""
    import ee

    era5 = (
        ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR")
        .filterDate(start_date, end_date)
        .select(
            ["temperature_2m", "dewpoint_temperature_2m", "total_precipitation_sum"],
            ["temp_k", "dewpoint_k", "era5_rain_m"],
        )
    )

    chirps = (
        ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
        .filterDate(start_date, end_date)
        .select(["precipitation"], ["chirps_rain_mm"])
    )

    filter_time = ee.Filter.equals(
        leftField="system:time_start", rightField="system:time_start"
    )
    joined = ee.Join.inner().apply(era5, chirps, filter_time)

    def combine_bands(feature):
        primary = ee.Image(feature.get("primary"))
        secondary = ee.Image(feature.get("secondary"))
        temp_c = primary.select("temp_k").subtract(273.15).rename("temp_c")
        dew_c = primary.select("dewpoint_k").subtract(273.15).rename("dewpoint_c")
        era5_rain_mm = (
            primary.select("era5_rain_m").multiply(1000.0).rename("era5_rain_mm")
        )
        chirps_rain_mm = secondary.select("chirps_rain_mm")
        return (
            temp_c.addBands(dew_c)
            .addBands(era5_rain_mm)
            .addBands(chirps_rain_mm)
            .set("system:time_start", primary.get("system:time_start"))
        )

    return ee.ImageCollection(joined.map(combine_bands))


def process_daily_weather_to_features(
    daily_df: pd.DataFrame,
    issue_dates: Iterable[pd.Timestamp],
    normal_30d_rain: float = 150.0,
) -> pd.DataFrame:
    """Transform daily weather records into dynamic features per issue date.

    Args:
        daily_df: DataFrame with columns ``['cell_id', 'date', 'temp_c', 'dewpoint_c', 'rain_mm']``
            or ``['cell_id', 'date', 'temp_c', 'rh_pct', 'rain_mm']``.
        issue_dates: Iterable of prediction issue dates ``t0``.
        normal_30d_rain: 30-day climatological normal rainfall in mm (default 150 mm for OKI).

    Returns:
        DataFrame with ``['cell_id', 'issue_date', 'temp_c', 'rh_pct', 'dc', 'dmc', 'rain_deficit_30d', 'feature_acquired_at']``.
    """
    df = daily_df.copy()
    df["date"] = pd.to_datetime(df["date"]).dt.normalize()

    if "rh_pct" not in df.columns and "dewpoint_c" in df.columns:
        df["rh_pct"] = fwi.rh_from_dewpoint(df["temp_c"], df["dewpoint_c"])

    # Pivot to cell x date matrices sorted by date
    pivot_temp = df.pivot(index="cell_id", columns="date", values="temp_c")
    pivot_rh = df.pivot(index="cell_id", columns="date", values="rh_pct")
    pivot_rain = df.pivot(index="cell_id", columns="date", values="rain_mm").fillna(0.0)

    dates = pd.DatetimeIndex(pivot_temp.columns)
    cell_ids = np.asarray(pivot_temp.index)

    # Compute daily DMC and DC arrays
    dmc_arr, dc_arr = fwi.compute_drought_codes(
        pivot_temp.values, pivot_rh.values, pivot_rain.values
    )

    dmc_df = pd.DataFrame(dmc_arr, index=cell_ids, columns=dates)
    dc_df = pd.DataFrame(dc_arr, index=cell_ids, columns=dates)

    # Rolling 30-day rain sum per cell
    rain_rolling_30d = pivot_rain.T.rolling(30, min_periods=30).sum().T

    results = []
    for t0 in pd.DatetimeIndex(list(issue_dates)).normalize():
        if t0 not in dates:
            continue
        # Only use observations up to t0 (feature_acquired_at = t0)
        t_temp = pivot_temp[t0]
        t_rh = pivot_rh[t0]
        t_dmc = dmc_df[t0]
        t_dc = dc_df[t0]
        t_rain_30d = rain_rolling_30d[t0]
        t_deficit = normal_30d_rain - t_rain_30d

        frame = pd.DataFrame(
            {
                "cell_id": cell_ids,
                "issue_date": t0,
                "temp_c": t_temp.values,
                "rh_pct": t_rh.values,
                "dc": t_dc.values,
                "dmc": t_dmc.values,
                "rain_deficit_30d": t_deficit.values,
                "feature_acquired_at": t0,
            }
        )
        results.append(frame)

    if not results:
        return pd.DataFrame(
            columns=[
                "cell_id",
                "issue_date",
                "temp_c",
                "rh_pct",
                "dc",
                "dmc",
                "rain_deficit_30d",
                "feature_acquired_at",
            ]
        )
    return pd.concat(results, ignore_index=True)
