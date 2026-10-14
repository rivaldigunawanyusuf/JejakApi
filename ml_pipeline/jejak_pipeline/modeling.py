"""Spatio-temporal modeling and evaluation via Spatial Block Cross-Validation.

Incorporates:
- Risk decomposition: Hazard x Vulnerability x Exposure
- Multi-tier baseline progression:
  * Baseline 0: Logistic Regression on pure weather
  * Baseline 1: Logistic Regression on weather + fire history
  * Model Full: LightGBM on all features
- Rare-event evaluation metrics: PR-AUC, Recall@top-5%, Precision@k, Brier Score, ECE
- Probability calibration via Platt scaling (sigmoid)
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# --- Feature groupings aligned with Risk Decomposition ---
WEATHER_FEATURES = [
    "temp_c",
    "rh_pct",
    "dc",
    "dmc",
    "rain_deficit_30d",
]

FIRE_HISTORY_FEATURES = [
    "fire_history_w0_30",
    "fire_history_w30_90",
    "fire_history_w90_365",
]

ANTHROPOGENIC_FEATURES = [
    "canal_density_km_km2",
    "distance_to_road_m",
    "distance_to_waterway_m",
    "clearing_w0_30",
    "clearing_w30_90",
    "clearing_w90_365",
]

FULL_FEATURES = WEATHER_FEATURES + FIRE_HISTORY_FEATURES + ANTHROPOGENIC_FEATURES

RISK_COMPONENTS = {
    "hazard": WEATHER_FEATURES,
    "vulnerability": ["canal_density_km_km2"] + FIRE_HISTORY_FEATURES,
    "exposure_trigger": [
        "clearing_w0_30",
        "clearing_w30_90",
        "clearing_w90_365",
        "distance_to_road_m",
        "distance_to_waterway_m",
    ],
}

# Standardized progression required by competition scientific evaluation
STANDARDIZED_MODEL_SPECS = {
    "Baseline_0_LogReg_Weather": {
        "features": WEATHER_FEATURES,
        "type": "logreg",
        "description": "Baseline 0: Logistic Regression (Pure Weather / FWI hazard proxy)",
    },
    "Baseline_1_LogReg_Weather_History": {
        "features": WEATHER_FEATURES + FIRE_HISTORY_FEATURES,
        "type": "logreg",
        "description": "Baseline 1: Logistic Regression (Weather + Historical Fire Memory)",
    },
    "Ablation_LogReg_Full": {
        "features": FULL_FEATURES,
        "type": "logreg",
        "description": "Ablation: Logistic Regression with Full Anthropogenic Features",
    },
    "Model_Full_LightGBM": {
        "features": FULL_FEATURES,
        "type": "lightgbm",
        "description": "Full Model: LightGBM Spatio-temporal Classifier with Non-linear Interactions",
    },
}

# Backward compatibility mapping
MODEL_FEATURE_SPECS = {
    "baseline_weather": WEATHER_FEATURES,
    "baseline_fire_history": FIRE_HISTORY_FEATURES,
    "baseline_weather_fire": WEATHER_FEATURES + FIRE_HISTORY_FEATURES,
    "full_model": FULL_FEATURES,
    "Baseline_0_LogReg_Weather": WEATHER_FEATURES,
    "Baseline_1_LogReg_Weather_History": WEATHER_FEATURES + FIRE_HISTORY_FEATURES,
    "Model_Full_LightGBM": FULL_FEATURES,
}


def assert_no_temporal_leakage(df: pd.DataFrame) -> None:
    """Audit dataset to guarantee zero future data leaks into inference (t <= t0)."""
    if "feature_acquired_at" in df.columns and "issue_date" in df.columns:
        leak_mask = df["feature_acquired_at"] > df["issue_date"]
        if leak_mask.any():
            violating_count = int(leak_mask.sum())
            raise AssertionError(
                f"CRITICAL: Found {violating_count} rows where feature_acquired_at > issue_date! "
                "Future data leakage detected."
            )


def compute_dual_ground_truth_label(
    viirs_detections: np.ndarray,
    modis_mcd64a1_burned: Optional[np.ndarray] = None,
    drone_verified: Optional[np.ndarray] = None,
) -> np.ndarray:
    """Formulate dual-label ground truth:
    Positive if:
    1) >= 1 NASA FIRMS VIIRS 375m detection in 30-day forward window, OR
    2) MODIS MCD64A1 500m burned area confirmation (capturing smoke-covered/smoldering peat fires), OR
    3) Field drone ground-truth verification (Feature F6 Active Learning).
    """
    label = (viirs_detections >= 1).astype(np.int8)
    if modis_mcd64a1_burned is not None:
        label = np.bitwise_or(label, (modis_mcd64a1_burned >= 1).astype(np.int8))
    if drone_verified is not None:
        label = np.bitwise_or(label, (drone_verified >= 1).astype(np.int8))
    return label


def spatial_block_cv_splits(df: pd.DataFrame) -> list[tuple[np.ndarray, np.ndarray]]:
    """Generate train/test index splits based on Kesatuan Hidrologis Gambut (KHG).

    Guarantees zero spatial leakage: cells belonging to the test KHG are completely
    excluded from the training fold.
    """
    groups = df["khg_id"].values
    unique_groups = np.unique(groups)
    splits = []

    for test_group in unique_groups:
        test_mask = groups == test_group
        train_mask = ~test_mask

        train_indices = np.where(train_mask)[0]
        test_indices = np.where(test_mask)[0]

        if len(train_indices) > 0 and len(test_indices) > 0:
            splits.append((train_indices, test_indices))

    return splits


def recall_at_top_k_pct(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    top_pct: float = 0.05,
) -> float:
    """Calculate the percentage of actual fire events captured in top k% risk cells."""
    y_t = np.asarray(y_true).astype(int)
    y_p = np.asarray(y_prob).astype(float)

    total_positives = int(np.sum(y_t == 1))
    if total_positives == 0:
        return 1.0

    k = max(1, math.ceil(len(y_p) * top_pct))
    top_indices = np.argsort(-y_p)[:k]
    captured_positives = int(np.sum(y_t[top_indices] == 1))

    return float(captured_positives / total_positives)


def precision_at_k(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    k: int = 16,
) -> float:
    """Calculate precision among the top-k ranked cells (resource-constrained)."""
    y_t = np.asarray(y_true).astype(int)
    y_p = np.asarray(y_prob).astype(float)

    if len(y_p) == 0:
        return 0.0

    k_eff = min(k, len(y_p))
    top_indices = np.argsort(-y_p)[:k_eff]
    captured_positives = int(np.sum(y_t[top_indices] == 1))
    return float(captured_positives / k_eff)


def compute_expected_calibration_error(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10,
) -> float:
    """Calculate Expected Calibration Error (ECE) across probability bins."""
    y_t = np.asarray(y_true).astype(int)
    y_p = np.asarray(y_prob).astype(float)

    bin_boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = len(y_t)

    for i in range(n_bins):
        in_bin = (y_p >= bin_boundaries[i]) & (y_p < bin_boundaries[i + 1])
        if i == n_bins - 1:
            in_bin |= (y_p == bin_boundaries[i + 1])
        bin_count = np.sum(in_bin)
        if bin_count > 0:
            bin_acc = np.mean(y_t[in_bin])
            bin_conf = np.mean(y_p[in_bin])
            ece += (bin_count / n) * abs(bin_acc - bin_conf)

    return float(round(ece, 4))


def compute_reliability_diagram_bins(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10,
) -> list[dict[str, Any]]:
    """Compute reliability diagram bins (mean predicted prob vs empirical fraction positive)."""
    y_t = np.asarray(y_true).astype(int)
    y_p = np.asarray(y_prob).astype(float)

    bin_boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    diagram = []

    for i in range(n_bins):
        low, high = bin_boundaries[i], bin_boundaries[i + 1]
        in_bin = (y_p >= low) & (y_p < high)
        if i == n_bins - 1:
            in_bin |= (y_p == high)
        count = int(np.sum(in_bin))
        if count > 0:
            mean_prob = float(np.mean(y_p[in_bin]))
            emp_freq = float(np.mean(y_t[in_bin]))
        else:
            mean_prob = float((low + high) / 2.0)
            emp_freq = 0.0

        diagram.append({
            "bin": i + 1,
            "range": [round(float(low), 2), round(float(high), 2)],
            "mean_predicted_prob": round(mean_prob, 4),
            "empirical_fraction_positive": round(emp_freq, 4),
            "cell_count": count,
        })

    return diagram


def evaluate_predictions(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    compute_detailed: bool = True,
) -> dict[str, Any]:
    """Compute rare-event evaluation metrics (PR-AUC, Recall@top-5%, Precision@k, Brier)."""
    y_t = np.asarray(y_true).astype(int)
    y_p = np.asarray(y_prob).astype(float)

    pr_auc = float(average_precision_score(y_t, y_p))
    roc_auc = float(roc_auc_score(y_t, y_p))
    recall_top_5 = recall_at_top_k_pct(y_t, y_p, top_pct=0.05)
    brier = float(brier_score_loss(y_t, y_p))

    metrics: dict[str, Any] = {
        "pr_auc": round(pr_auc, 4),
        "roc_auc": round(roc_auc, 4),
        "recall_top_5pct": round(recall_top_5, 4),
        "brier_score": round(brier, 4),
    }

    if compute_detailed:
        metrics["precision_at_k11"] = round(precision_at_k(y_t, y_p, k=11), 4)
        metrics["precision_at_k16"] = round(precision_at_k(y_t, y_p, k=16), 4)
        metrics["ece"] = compute_expected_calibration_error(y_t, y_p, n_bins=10)

    return metrics


def build_pipeline_model(
    model_type: str,
    n_estimators: int = 100,
    learning_rate: float = 0.05,
    max_depth: int = 6,
    num_leaves: int = 31,
    random_state: int = 42,
) -> Any:
    """Instantiate appropriate model architecture with proper scaling/weighting."""
    if model_type == "logreg":
        return Pipeline([
            ("scaler", StandardScaler()),
            (
                "clf",
                LogisticRegression(
                    class_weight="balanced",
                    max_iter=300,
                    random_state=random_state,
                    solver="lbfgs",
                ),
            ),
        ])
    else:
        return lgb.LGBMClassifier(
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            max_depth=max_depth,
            num_leaves=num_leaves,
            random_state=random_state,
            class_weight="balanced",
            verbose=-1,
            n_jobs=-1,
        )


def calibrate_classifier_platt(
    clf: Any,
    X_train: np.ndarray,
    y_train: np.ndarray,
    cv: int = 3,
) -> CalibratedClassifierCV:
    """Calibrate probabilities using Platt Scaling (sigmoid calibration)."""
    calibrated = CalibratedClassifierCV(
        estimator=clf,
        method="sigmoid",
        cv=cv,
    )
    calibrated.fit(X_train, y_train)
    return calibrated


def train_and_evaluate(
    df: pd.DataFrame,
    n_estimators: int = 100,
    learning_rate: float = 0.05,
    max_depth: int = 6,
    num_leaves: int = 31,
    random_state: int = 42,
    apply_calibration: bool = True,
) -> dict[str, Any]:
    """Train baseline models vs full model using Spatial Block Cross-Validation.

    Supports both standardized names and legacy keys for 100% backward compatibility.
    """
    splits = spatial_block_cv_splits(df)
    models: dict[str, Any] = {}
    calibrated_models: dict[str, Any] = {}
    metrics: dict[str, dict[str, Any]] = {}
    calibrated_metrics: dict[str, dict[str, Any]] = {}

    target_specs = {
        "Baseline_0_LogReg_Weather": ("logreg", WEATHER_FEATURES),
        "Baseline_1_LogReg_Weather_History": ("logreg", WEATHER_FEATURES + FIRE_HISTORY_FEATURES),
        "Model_Full_LightGBM": ("lightgbm", FULL_FEATURES),
    }

    y = df["label_30d"].values

    for name, (m_type, features) in target_specs.items():
        X = df[features].values
        oof_raw_probs = np.zeros(len(df), dtype=float)
        oof_cal_probs = np.zeros(len(df), dtype=float)

        for train_idx, test_idx in splits:
            X_train, y_train = X[train_idx], y[train_idx]
            X_test, y_test = X[test_idx], y[test_idx]

            fold_model = build_pipeline_model(
                m_type,
                n_estimators=n_estimators,
                learning_rate=learning_rate,
                max_depth=max_depth,
                num_leaves=num_leaves,
                random_state=random_state,
            )
            fold_model.fit(X_train, y_train)
            raw_p = fold_model.predict_proba(X_test)[:, 1]
            oof_raw_probs[test_idx] = raw_p

            if apply_calibration and len(np.unique(y_train)) > 1:
                # Calibrate on train folds
                cv_folds = min(3, len(np.unique(df.iloc[train_idx]["khg_id"])))
                cv_folds = max(2, cv_folds)
                cal_fold = CalibratedClassifierCV(estimator=fold_model, method="sigmoid", cv=cv_folds)
                cal_fold.fit(X_train, y_train)
                oof_cal_probs[test_idx] = cal_fold.predict_proba(X_test)[:, 1]
            else:
                oof_cal_probs[test_idx] = raw_p

        # Evaluate Out-Of-Fold predictions
        perf_raw = evaluate_predictions(y, oof_raw_probs)
        perf_cal = evaluate_predictions(y, oof_cal_probs)

        metrics[name] = perf_raw
        calibrated_metrics[name] = perf_cal

        # Fit final model on all data
        final_model = build_pipeline_model(
            m_type,
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            max_depth=max_depth,
            num_leaves=num_leaves,
            random_state=random_state,
        )
        final_model.fit(X, y)
        models[name] = final_model

        if apply_calibration and len(np.unique(y)) > 1:
            cal_final = CalibratedClassifierCV(estimator=final_model, method="sigmoid", cv=3)
            cal_final.fit(X, y)
            calibrated_models[name] = cal_final
        else:
            calibrated_models[name] = final_model

    # Populate legacy aliases for backward compatibility with existing tests
    models["baseline_weather"] = models["Baseline_0_LogReg_Weather"]
    models["baseline_weather_fire"] = models["Baseline_1_LogReg_Weather_History"]
    models["full_model"] = models["Model_Full_LightGBM"]

    metrics["baseline_weather"] = metrics["Baseline_0_LogReg_Weather"]
    metrics["baseline_weather_fire"] = metrics["Baseline_1_LogReg_Weather_History"]
    metrics["full_model"] = metrics["Model_Full_LightGBM"]

    return {
        "models": models,
        "calibrated_models": calibrated_models,
        "metrics": metrics,
        "calibrated_metrics": calibrated_metrics,
    }
