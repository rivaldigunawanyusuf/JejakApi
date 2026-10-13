"""NASA FIRMS active-fire (VIIRS S-NPP 375 m) download, parsing and cell mapping."""

from __future__ import annotations

import io
from collections.abc import Callable
from typing import IO

import pandas as pd

from . import grid
from . import http as http_utils

BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
MAX_DAY_RANGE = 5  # documented limit of the FIRMS Area API
DEFAULT_SOURCE = "VIIRS_SNPP_SP"  # standard-processing archive (research quality)
_CONFIDENCE_RANK = {"l": 0, "n": 1, "h": 2}
_COLUMNS = [
    "latitude",
    "longitude",
    "acq_date",
    "acq_time",
    "satellite",
    "confidence",
    "frp",
    "daynight",
]


class FirmsError(RuntimeError):
    """Raised when FIRMS returns an unexpected payload."""


def build_area_urls(
    map_key: str,
    source: str,
    bbox: tuple[float, float, float, float],
    start: str | pd.Timestamp,
    end: str | pd.Timestamp,
    max_days: int = MAX_DAY_RANGE,
) -> list[str]:
    """Build Area API URLs covering ``[start, end]`` (inclusive) in <=5-day chunks.

    Args:
        map_key: 32-character FIRMS MAP_KEY.
        source: FIRMS source, e.g. ``VIIRS_SNPP_SP``.
        bbox: ``(west, south, east, north)``.
    """
    if len(map_key) != 32:
        raise ValueError("MAP_KEY must be 32 characters")
    start_ts, end_ts = pd.Timestamp(start), pd.Timestamp(end)
    if end_ts < start_ts:
        raise ValueError("end must not be before start")
    west, south, east, north = bbox
    area = f"{west},{south},{east},{north}"
    urls = []
    cursor = start_ts
    while cursor <= end_ts:
        days = min(max_days, (end_ts - cursor).days + 1)
        urls.append(f"{BASE_URL}/{map_key}/{source}/{area}/{days}/{cursor:%Y-%m-%d}")
        cursor += pd.Timedelta(days=days)
    return urls


def parse_firms_csv(source: str | IO[str]) -> pd.DataFrame:
    """Parse a FIRMS CSV into a normalised DataFrame (empty input -> empty frame)."""
    try:
        df = pd.read_csv(
            source,
            dtype={"acq_time": str, "confidence": str},
            keep_default_na=False,
            na_values=[""],
        )
    except pd.errors.EmptyDataError:
        df = pd.DataFrame(columns=_COLUMNS)
    for col in _COLUMNS:
        if col not in df.columns:
            df[col] = pd.Series(dtype=object)
    df["acq_date"] = pd.to_datetime(df["acq_date"])
    df["confidence"] = df["confidence"].astype(str).str.lower()
    df["frp"] = pd.to_numeric(df["frp"], errors="coerce").astype(float)
    df["latitude"] = pd.to_numeric(df["latitude"]).astype(float)
    df["longitude"] = pd.to_numeric(df["longitude"]).astype(float)
    return df.reset_index(drop=True)


def filter_confidence(df: pd.DataFrame, min_confidence: str = "n") -> pd.DataFrame:
    """Keep VIIRS detections at or above ``min_confidence`` (l < n < h)."""
    threshold = _CONFIDENCE_RANK[min_confidence]
    rank = df["confidence"].map(_CONFIDENCE_RANK)
    return df[rank >= threshold].reset_index(drop=True)


def hotspots_to_cells(df: pd.DataFrame) -> pd.DataFrame:
    """Add the 1 km ``cell_id`` of every hotspot."""
    out = df.copy()
    if len(out) == 0:
        out["cell_id"] = pd.Series(dtype=object)
        return out
    out["cell_id"] = grid.cell_ids_for_lonlat(out["longitude"], out["latitude"])
    return out


def fetch_firms(
    map_key: str,
    source: str,
    bbox: tuple[float, float, float, float],
    start: str | pd.Timestamp,
    end: str | pd.Timestamp,
    get: Callable[[str], str] = http_utils.get_text,
) -> pd.DataFrame:
    """Download all detections in ``bbox`` for ``[start, end]`` and deduplicate.

    Raises:
        FirmsError: when a response is not a CSV (e.g. invalid key, rate limit).
            The MAP_KEY is never included in the message.
    """
    frames = []
    for url in build_area_urls(map_key, source, bbox, start, end):
        text = get(url)
        if text.strip() and not text.lstrip().startswith("latitude"):
            snippet = text.strip()[:120].replace(map_key, "***")
            raise FirmsError(f"unexpected FIRMS response: {snippet!r}")
        frames.append(parse_firms_csv(io.StringIO(text)))
    df = pd.concat(frames, ignore_index=True) if frames else parse_firms_csv("")
    keys = ["latitude", "longitude", "acq_date", "acq_time", "satellite"]
    return df.drop_duplicates(subset=keys).reset_index(drop=True)
