"""Tests for Model Progression Benchmark & Probability Calibration API (Feature F3)."""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_get_model_benchmark_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/model/benchmark")
        assert response.status_code == 200
        data = response.json()

        # Verify top-level structure
        assert "models" in data
        assert "validation_protocol" in data
        assert "data_provenance" in data
        assert "lift_over_baseline_0" in data
        assert "lift_over_baseline_1" in data

        # Verify presence of mandatory models
        models = data["models"]
        assert "Baseline_0_LogReg_Weather" in models
        assert "Baseline_1_LogReg_Weather_History" in models
        assert "Model_Full_LightGBM" in models

        # Verify rare-event metric standardization (Accuracy must NOT be used)
        for model_name, m in models.items():
            assert "accuracy" not in m
            assert "pr_auc" in m and 0.0 <= m["pr_auc"] <= 1.0
            assert "recall_top_5pct" in m and 0.0 <= m["recall_top_5pct"] <= 1.0
            assert "brier_score_calibrated" in m
            assert "ece_calibrated" in m
            assert "reliability_diagram" in m
            assert len(m["reliability_diagram"]) == 10

        # Verify calibrated Brier score is valid [0, 1]
        full_m = models["Model_Full_LightGBM"]
        assert 0.0 <= full_m["brier_score_calibrated"] <= 1.0
        assert 0.0 <= full_m["ece_calibrated"] <= 1.0


@pytest.mark.asyncio
async def test_benchmark_empirical_lifts():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/model/benchmark")
        assert response.status_code == 200
        data = response.json()

        lift_b1 = data["lift_over_baseline_1"]
        assert "pr_auc_lift" in lift_b1
        assert "recall_top_5pct_lift" in lift_b1
        assert lift_b1["pr_auc_lift"] >= 0.0  # LightGBM provides positive lift over weather+history

        # Verify supervisor evaluation sections
        assert "validation_comparison" in data
        assert "Spatial_Block_KHG_CV" in data["validation_comparison"]["methods"]
        assert "Random_CV_Leaky" in data["validation_comparison"]["methods"]

        assert "normal_year_false_alarm_check_2024_2025" in data
        assert data["normal_year_false_alarm_check_2024_2025"]["model_full_lightgbm"]["false_alarm_pct"] < 20.0

        assert "fwi_oki_relevance_study" in data
        assert "lahan_a" in data["fwi_oki_relevance_study"]["case_study"]
        assert "lahan_b" in data["fwi_oki_relevance_study"]["case_study"]
        assert data["fwi_oki_relevance_study"]["case_study"]["lahan_b"]["jejak_api_risk_score"] > data["fwi_oki_relevance_study"]["case_study"]["lahan_a"]["jejak_api_risk_score"]

        assert "methodology_note" in data
        assert "pre_ignition_conditional_risk" in data["methodology_note"]

        assert "fairness_land_class_audit" in data
        assert "dual_label_provenance" in data

