"""Unit tests for LightGBM spatio-temporal modeling and Spatial Block CV."""

import numpy as np
import pandas as pd
import pytest

from jejak_pipeline import modeling


@pytest.fixture
def sample_master_df():
    # 5 cells across 3 KHGs, 4 issue dates
    records = []
    khg_map = {
        "C1": "KHG_SUGIHAN_LUMPUR",
        "C2": "KHG_SUGIHAN_LUMPUR",
        "C3": "KHG_LUMPUR_JERUJU",
        "C4": "KHG_BURNAI_SIBUMBUNG",
        "C5": "NON_KHG",
    }
    dates = pd.date_range("2023-08-01", periods=4, freq="14D")
    rng = np.random.default_rng(42)

    for d in dates:
        for cid, khg in khg_map.items():
            records.append(
                {
                    "cell_id": cid,
                    "issue_date": d,
                    "khg_id": khg,
                    "lon": 105.0,
                    "lat": -3.0,
                    "temp_c": 31.0 + rng.normal(0, 1),
                    "rh_pct": 65.0 + rng.normal(0, 5),
                    "dc": 400.0 + rng.normal(0, 50),
                    "dmc": 40.0 + rng.normal(0, 5),
                    "rain_deficit_30d": 80.0 + rng.normal(0, 10),
                    "canal_density_km_km2": 2.5 if cid in ["C1", "C3"] else 0.0,
                    "distance_to_road_m": 1200.0,
                    "distance_to_waterway_m": 800.0,
                    "fire_history_w0_30": 1.0 if cid == "C1" else 0.0,
                    "fire_history_w30_90": 2.0 if cid == "C1" else 0.0,
                    "fire_history_w90_365": 5.0 if cid == "C1" else 0.0,
                    "clearing_w0_30": 1.5 if cid == "C1" else 0.0,
                    "clearing_w30_90": 2.0 if cid == "C1" else 0.0,
                    "clearing_w90_365": 4.0 if cid == "C1" else 0.0,
                    "feature_acquired_at": d,
                    "label_30d": 1 if cid in ["C1", "C3"] and d >= pd.Timestamp("2023-08-15") else 0,
                }
            )
    return pd.DataFrame(records)


def test_spatial_block_cv_splits_are_disjoint(sample_master_df):
    splits = modeling.spatial_block_cv_splits(sample_master_df)
    assert len(splits) > 1

    for train_idx, test_idx in splits:
        train_khg = set(sample_master_df.iloc[train_idx]["khg_id"])
        test_khg = set(sample_master_df.iloc[test_idx]["khg_id"])
        # Spatial independence: test KHG must never appear in train set
        assert len(train_khg.intersection(test_khg)) == 0


def test_recall_at_top_k_pct():
    y_true = np.array([1, 1, 0, 0, 0, 0, 0, 0, 0, 0])  # 2 positives out of 10
    # Perfect ranking
    y_prob_perfect = np.array([0.9, 0.8, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05, 0.02, 0.01])
    # Top 20% (k=2) captures both positives -> 100%
    recall = modeling.recall_at_top_k_pct(y_true, y_prob_perfect, top_pct=0.2)
    assert recall == 1.0

    # Top 10% (k=1) captures 1 positive out of 2 -> 50%
    recall_10 = modeling.recall_at_top_k_pct(y_true, y_prob_perfect, top_pct=0.1)
    assert recall_10 == 0.5


def test_precision_at_k():
    y_true = np.array([1, 1, 1, 0, 0, 0, 0, 0, 0, 0])
    y_prob = np.array([0.9, 0.8, 0.7, 0.4, 0.3, 0.2, 0.1, 0.05, 0.02, 0.01])
    # Top 3 cells have 3 positives -> precision = 1.0
    assert modeling.precision_at_k(y_true, y_prob, k=3) == 1.0
    # Top 5 cells have 3 positives out of 5 -> precision = 0.6
    assert modeling.precision_at_k(y_true, y_prob, k=5) == 0.6


def test_temporal_feature_leakage(sample_master_df):
    """Ensure no future temporal leakage exists (timestamp <= t0)."""
    assert (sample_master_df["feature_acquired_at"] <= sample_master_df["issue_date"]).all()
    modeling.assert_no_temporal_leakage(sample_master_df)

    # Test that assertion fails when future leakage is injected
    leaky_df = sample_master_df.copy()
    leaky_df.loc[0, "feature_acquired_at"] = leaky_df.loc[0, "issue_date"] + pd.Timedelta(days=5)
    with pytest.raises(AssertionError, match="Future data leakage detected"):
        modeling.assert_no_temporal_leakage(leaky_df)


def test_dual_ground_truth_label_formation():
    """Verify dual ground-truth formation: VIIRS + MODIS MCD64A1 + Drone labels."""
    viirs = np.array([1, 0, 0, 0, 1])
    mcd64a1 = np.array([0, 1, 0, 0, 0])  # Captures smoke-covered/subsurface peat fire missed by VIIRS
    drone = np.array([0, 0, 1, 0, 0])    # Field drone verified active smoldering

    # Union of ground truths
    dual_label = modeling.compute_dual_ground_truth_label(viirs, mcd64a1, drone)
    expected = np.array([1, 1, 1, 0, 1], dtype=np.int8)
    np.testing.assert_array_equal(dual_label, expected)


def test_probability_calibration_range():
    """Ensure calibrated probabilities strictly fall within [0.0, 1.0] without NaN."""
    y_true = np.array([1, 0, 1, 0, 1, 0, 0, 0, 1, 0] * 5)
    X = np.random.randn(len(y_true), 4)

    clf = modeling.build_pipeline_model("logreg", random_state=42)
    cal_clf = modeling.calibrate_classifier_platt(clf, X, y_true, cv=3)

    probs = cal_clf.predict_proba(X)[:, 1]
    assert np.all(probs >= 0.0)
    assert np.all(probs <= 1.0)
    assert not np.isnan(probs).any()
    assert not np.isinf(probs).any()


def test_expected_calibration_error_and_diagram():
    y_true = np.array([1, 0, 1, 0, 1, 0, 0, 0, 1, 0])
    y_prob = np.array([0.9, 0.1, 0.8, 0.2, 0.7, 0.3, 0.2, 0.1, 0.85, 0.15])
    ece = modeling.compute_expected_calibration_error(y_true, y_prob, n_bins=5)
    assert 0.0 <= ece <= 1.0

    diagram = modeling.compute_reliability_diagram_bins(y_true, y_prob, n_bins=5)
    assert len(diagram) == 5
    for b in diagram:
        assert "mean_predicted_prob" in b
        assert "empirical_fraction_positive" in b
        assert 0.0 <= b["mean_predicted_prob"] <= 1.0
        assert 0.0 <= b["empirical_fraction_positive"] <= 1.0


def test_train_and_evaluate_models(sample_master_df):
    results = modeling.train_and_evaluate(
        sample_master_df,
        n_estimators=10,
        random_state=42,
    )
    assert "models" in results
    assert "metrics" in results
    assert "baseline_weather" in results["models"]
    assert "full_model" in results["models"]
    assert "Baseline_0_LogReg_Weather" in results["models"]
    assert "Baseline_1_LogReg_Weather_History" in results["models"]
    assert "Model_Full_LightGBM" in results["models"]

    metrics = results["metrics"]
    for m in ["Baseline_0_LogReg_Weather", "Model_Full_LightGBM"]:
        assert "pr_auc" in metrics[m]
        assert "roc_auc" in metrics[m]
        assert "recall_top_5pct" in metrics[m]
        assert "brier_score" in metrics[m]
