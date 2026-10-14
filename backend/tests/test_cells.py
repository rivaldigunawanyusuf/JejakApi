"""Tests for Cell inspection & TreeSHAP narrative API endpoint (Feature F1)."""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_cell_shap_explanation_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # First get a valid cell_id from patrol top-k
        patrol_res = await ac.get("/api/patrol/top-k?k=1")
        assert patrol_res.status_code == 200
        cell_id = patrol_res.json()["results"][0]["cell_id"]

        # Inspect the cell
        response = await ac.get(f"/api/cells/{cell_id}/inspect")
        assert response.status_code == 200
        payload = response.json()

        assert payload["cell_id"] == cell_id
        assert 0.0 <= payload["risk_score"] <= 1.0
        assert payload["risk_category"] in ["Bahaya", "Siaga", "Waspada"]
        assert "top_factors" in payload
        assert len(payload["top_factors"]) == 3

        for factor in payload["top_factors"]:
            assert "feature_name" in factor
            assert "contribution_score" in factor
            assert "narrative" in factor
            assert len(factor["narrative"]) > 0


@pytest.mark.asyncio
async def test_cell_inspect_not_found():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/cells/NON_EXISTENT_CELL/inspect")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
