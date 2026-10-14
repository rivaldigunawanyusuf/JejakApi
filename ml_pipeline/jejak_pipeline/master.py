"""Master dataset assembly and contract validation (Phase 1 deliverable)."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from . import config

KEY_COLUMNS = ["cell_id", "issue_date"]
REQUIRED_COLUMNS = [
    "cell_id",
    "issue_date",
    "khg_id",
    "lon",
    "lat",
    "dc",
    "dmc",
    "label_30d",
    "feature_acquired_at",
]
NOT_NULL_COLUMNS = [
    "cell_id",
    "issue_date",
    "khg_id",
    "lon",
    "lat",
    "label_30d",
    "feature_acquired_at",
]


class MasterValidationError(ValueError):
    """Raised when the master dataset violates its contract."""


def validate_master(df: pd.DataFrame) -> None:
    """Validate schema, keys, label and temporal-leakage invariants.

    Raises:
        MasterValidationError: on the first violated invariant.
    """
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise MasterValidationError(f"missing required columns: {missing}")

    null_cols = [c for c in NOT_NULL_COLUMNS if df[c].isna().any()]
    if null_cols:
        raise MasterValidationError(f"null values in required columns: {null_cols}")

    if df.duplicated(subset=KEY_COLUMNS).any():
        raise MasterValidationError("duplicate (cell_id, issue_date) rows")

    if not df["label_30d"].isin([0, 1]).all():
        raise MasterValidationError("label_30d must be binary {0, 1}")

    if (df["feature_acquired_at"] > df["issue_date"]).any():
        raise MasterValidationError(
            "temporal leakage: feature_acquired_at is later than issue_date"
        )

    minx, miny, maxx, maxy = config.OKI_SANITY_BBOX
    in_box = df["lon"].between(minx, maxx) & df["lat"].between(miny, maxy)
    if not in_box.all():
        raise MasterValidationError(
            f"{int((~in_box).sum())} rows fall outside the OKI sanity bbox"
        )


def assemble(
    cells: pd.DataFrame, dynamic: pd.DataFrame, labels: pd.DataFrame
) -> pd.DataFrame:
    """Join static cell attributes, dynamic features and labels.

    Rows without a label (censored issue dates) are dropped; static attributes
    are broadcast to every issue date of a cell.
    """
    keyed = dynamic.merge(labels, on=KEY_COLUMNS, how="inner", validate="1:1")
    out = keyed.merge(cells, on="cell_id", how="left", validate="m:1")
    return out.sort_values(KEY_COLUMNS).reset_index(drop=True)


def write_parquet(df: pd.DataFrame, path: str | Path) -> Path:
    """Write the master dataset as zstd Parquet sorted for columnar DuckDB scans."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.sort_values(KEY_COLUMNS).to_parquet(
        path, engine="pyarrow", compression="zstd", index=False
    )
    return path
