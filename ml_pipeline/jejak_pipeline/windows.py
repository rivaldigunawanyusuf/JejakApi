"""Look-ahead-free multi-window aggregation of daily per-cell signals."""

from __future__ import annotations

from collections.abc import Iterable, Sequence

import numpy as np
import pandas as pd


def window_sums(
    daily: pd.DataFrame,
    issue_dates: Iterable[pd.Timestamp],
    windows: Sequence[tuple[int, int]],
    prefix: str,
) -> pd.DataFrame:
    """Sum a daily signal over trailing windows measured in days before ``t0``.

    A window ``(lo, hi)`` covers observations with ``lo <= (t0 - d) < hi`` days, so
    ``(0, 30)`` is the 30 days ending on (and including) the issue date ``t0``.
    Nothing dated after ``t0`` is ever used (no temporal leakage).

    Args:
        daily: Contiguous daily DataFrame, ``DatetimeIndex`` rows, one column per
            ``cell_id``. Must not contain NaN (use 0 for "no detection").
        issue_dates: Prediction issue dates ``t0``.
        windows: Sequence of ``(lo, hi)`` day bounds, ``[lo, hi)``.
        prefix: Output column prefix; columns are named ``{prefix}_w{lo}_{hi}``.

    Returns:
        Long DataFrame with ``cell_id``, ``issue_date`` and one column per window.
        A window with incomplete history (before the first day of ``daily``, or
        after its last day) yields NaN instead of a silently truncated sum.
    """
    if daily.isna().any().any():
        raise ValueError("daily contains NaN; fill with 0 or handle upstream")
    idx = pd.DatetimeIndex(daily.index).normalize()
    if len(idx) > 1 and not (np.diff(idx.values) == np.timedelta64(1, "D")).all():
        raise ValueError("daily index must be contiguous with 1-day steps")

    start, end = idx[0], idx[-1]
    values = daily.to_numpy(dtype=float)
    cumulative = np.vstack([np.zeros((1, values.shape[1])), np.cumsum(values, axis=0)])
    n_cells = values.shape[1]
    cell_ids = np.asarray(daily.columns, dtype=object)

    def cum_at(day: pd.Timestamp) -> np.ndarray | None:
        """Sum of the series through ``day`` (inclusive); None if unknowable."""
        offset = (day - start).days
        if offset < -1 or day > end:
            return None
        return cumulative[offset + 1]

    frames = []
    for t0 in pd.DatetimeIndex(list(issue_dates)).normalize():
        cols: dict[str, np.ndarray] = {}
        for lo, hi in windows:
            upper = cum_at(t0 - pd.Timedelta(days=lo))
            lower = cum_at(t0 - pd.Timedelta(days=hi))
            if upper is None or lower is None:
                cols[f"{prefix}_w{lo}_{hi}"] = np.full(n_cells, np.nan)
            else:
                cols[f"{prefix}_w{lo}_{hi}"] = upper - lower
        frame = pd.DataFrame(cols)
        frame.insert(0, "issue_date", t0)
        frame.insert(0, "cell_id", cell_ids)
        frames.append(frame)
    return pd.concat(frames, ignore_index=True)
