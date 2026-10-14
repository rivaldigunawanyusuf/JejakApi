"""Tests for the master dataset generation workflow."""

import numpy as np
import pandas as pd
import pytest

from jejak_pipeline import master


def test_master_validation_passes_valid_frame():
    df = pd.DataFrame(
        {
            "cell_id": ["C1", "C2"],
            "issue_date": pd.to_datetime(["2023-08-01", "2023-08-01"]),
            "khg_id": ["KHG_SUGIHAN_LUMPUR", "KHG_LUMPUR_JERUJU"],
            "lon": [105.1, 105.2],
            "lat": [-3.1, -3.2],
            "dc": [450.0, 520.0],
            "dmc": [45.0, 60.0],
            "temp_c": [31.5, 32.0],
            "rh_pct": [65.0, 58.0],
            "rain_deficit_30d": [80.0, 110.0],
            "label_30d": [0, 1],
            "feature_acquired_at": pd.to_datetime(["2023-08-01", "2023-08-01"]),
        }
    )
    # Must not raise
    master.validate_master(df)


def test_master_validation_catches_leakage():
    df = pd.DataFrame(
        {
            "cell_id": ["C1"],
            "issue_date": pd.to_datetime(["2023-08-01"]),
            "khg_id": ["KHG_SUGIHAN_LUMPUR"],
            "lon": [105.1],
            "lat": [-3.1],
            "dc": [450.0],
            "dmc": [45.0],
            "label_30d": [0],
            "feature_acquired_at": pd.to_datetime(["2023-08-05"]),  # future!
        }
    )
    with pytest.raises(master.MasterValidationError, match="temporal leakage"):
        master.validate_master(df)
