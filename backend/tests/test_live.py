"""Tests for live real-time intelligence endpoints."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_live_weather():
    response = client.get("/api/live/weather?lat=-3.35&lon=105.30")
    assert response.status_code == 200
    data = response.json()
    assert "wind_speed_kmh" in data
    assert "wind_direction_cardinal" in data
    assert "smoke_drift_direction_cardinal" in data
    assert "fire_spread_risk" in data


def test_get_live_hotspots():
    response = client.get("/api/live/hotspots?only_epicenters=true")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert "metadata" in data
    assert "source" in data["metadata"]
