"""Tests for Summary Statistics and Alert Webhook endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_stats_summary():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/stats/summary")
        assert response.status_code == 200
        data = response.json()

        assert "total_cells" in data
        assert data["total_cells"] >= 17000
        assert "risk_distribution" in data
        dist = data["risk_distribution"]
        assert "Bahaya" in dist and "Siaga" in dist and "Waspada" in dist
        assert "mean_canal_density_km_km2" in data
        assert "max_risk_score" in data
        assert 0.0 <= data["max_risk_score"] <= 1.0


@pytest.mark.asyncio
async def test_simulate_alert_webhook():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "target_area_name": "Kecamatan Cengal",
            "khg_id": "KHG_SUGIHAN_LUMPUR",
            "risk_threshold": 0.60,
        }
        response = await ac.post("/api/alerts/webhook/simulate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "simulated"
        assert "telegram_digest" in data
        assert "target_area" in data
        assert data["target_area"] == "Kecamatan Cengal"
        assert "alert_level" in data
        assert data["alert_level"] in ["BAHAYA", "SIAGA", "WASPADA", "AMAN"]
        assert len(data["telegram_digest"]) > 0
