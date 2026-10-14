"""Unit tests for TreeSHAP local explainer and narrative generation."""

import lightgbm as lgb
import numpy as np
import pandas as pd
import pytest

from jejak_pipeline import explainer


@pytest.fixture
def trained_toy_model():
    X = np.array(
        [
            [1.0, 100.0, 500.0],
            [0.0, 5000.0, 100.0],
            [3.0, 200.0, 800.0],
            [0.5, 3000.0, 200.0],
        ]
    )
    y = np.array([1, 0, 1, 0])
    feature_names = ["canal_density_km_km2", "distance_to_road_m", "dc"]
    clf = lgb.LGBMClassifier(n_estimators=5, random_state=42, verbose=-1)
    clf.fit(X, y)
    return clf, feature_names


def test_explain_cells_shap(trained_toy_model):
    clf, feature_names = trained_toy_model
    X_test = pd.DataFrame(
        [
            [2.5, 300.0, 750.0],
            [0.0, 6000.0, 150.0],
        ],
        columns=feature_names,
    )

    factors_per_cell = explainer.explain_cells_shap(clf, X_test)
    assert len(factors_per_cell) == 2

    first_cell_factors = factors_per_cell[0]
    assert len(first_cell_factors) == 3  # exactly 3 top factors
    for factor in first_cell_factors:
        assert "feature_name" in factor
        assert "contribution_score" in factor
        assert "narrative" in factor
        assert len(factor["narrative"]) > 0


def test_narrative_mapping_neutrality():
    narrative = explainer.get_feature_narrative("canal_density_km_km2", 2.5)
    assert "kanal" in narrative.lower()
    # Ensure compliance with SECURITY_REVIEW_GUIDE (no accusatory language)
    assert "pidana" not in narrative.lower()
    assert "korporasi" not in narrative.lower()
