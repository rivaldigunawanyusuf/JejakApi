"""Daily hotspot counting and 30-day-ahead binary labels."""

from __future__ import annotations

from collections.abc import Iterable, Sequence

import numpy as np
import pandas as pd

from . import config


def daily_counts(
    events: pd.DataFrame,
    cell_ids: Sequence[str],
    start: str | pd.Timestamp,
    end: str | pd.Timestamp,
) -> pd.DataFrame:
    """Count events (e.g. FIRMS hotspots) per cell and day.

    Args:
        events: Columns ``cell_id`` and ``acq_date``.
        cell_ids: Cells to include as columns (events elsewhere are dropped).
        start, end: Inclusive date range.

    Returns:
        DataFrame indexed by every day in ``[start, end]`` with one int column per
        cell.
    """
    index = pd.date_range(pd.Timestamp(start), pd.Timestamp(end), freq="D")
    df = events[events["cell_id"].isin(cell_ids)].copy()
    df["acq_date"] = pd.to_datetime(df["acq_date"]).dt.normalize()
    df = df[df["acq_date"].between(index[0], index[-1])]
    counts = df.groupby(["acq_date", "cell_id"]).size().unstack("cell_id", fill_value=0)
    return counts.reindex(index=index, columns=list(cell_ids), fill_value=0).astype(
        "int64"
    )


def label_horizon(
    counts: pd.DataFrame,
    issue_dates: Iterable[pd.Timestamp],
    horizon: int = config.FORECAST_HORIZON_DAYS,
) -> pd.DataFrame:
    """Binary label: any event in the half-open window ``(t0, t0 + horizon]``.

    Events on ``t0`` itself are excluded, so the label never overlaps the data
    available when the prediction is issued. Issue dates whose window extends past
    the end of ``counts`` are censored and dropped (never labelled 0 by default).

    Returns:
        DataFrame with ``cell_id``, ``issue_date``, ``label_{horizon}d`` (int8) and
        ``n_hotspots_{horizon}d``.
    """
    idx = pd.DatetimeIndex(counts.index).normalize()
    start, end = idx[0], idx[-1]
    values = counts.to_numpy(dtype=np.int64)
    cumulative = np.vstack(
        [np.zeros((1, values.shape[1]), dtype=np.int64), np.cumsum(values, axis=0)]
    )
    cell_ids = np.asarray(counts.columns, dtype=object)
    label_col, n_col = f"label_{horizon}d", f"n_hotspots_{horizon}d"

    frames = []
    for t0 in pd.DatetimeIndex(list(issue_dates)).normalize():
        t_end = t0 + pd.Timedelta(days=horizon)
        if t_end > end or t0 < start:
            continue  # censored: window not fully observed
        n = cumulative[(t_end - start).days + 1] - cumulative[(t0 - start).days + 1]
        frames.append(
            pd.DataFrame(
                {
                    "cell_id": cell_ids,
                    "issue_date": t0,
                    label_col: (n > 0).astype(np.int8),
                    n_col: n,
                }
            )
        )
    if not frames:
        return pd.DataFrame(
            {
                "cell_id": pd.Series(dtype=object),
                "issue_date": pd.Series(dtype="datetime64[ns]"),
                label_col: pd.Series(dtype=np.int8),
                n_col: pd.Series(dtype=np.int64),
            }
        )
    return pd.concat(frames, ignore_index=True)
