"""Unit tests for Drone Live-Stream Verification & Active Learning Endpoints (Feature F6)."""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_get_drone_missions():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/drone/missions")
        assert response.status_code == 200
        data = response.json()

        assert "missions" in data
        assert "operational_mode" in data
        assert data["operational_mode"] == "MANUAL_VLOS_MAX_120M"
        assert len(data["missions"]) >= 3

        # Check mission attributes
        m = data["missions"][0]
        assert "cell_id" in m
        assert "altitude_m_agl" in m
        assert m["altitude_m_agl"] <= 120.0  # Must comply with Kemenhub CASR 107
        assert m["vlos_compliant"] is True
        assert "battery_pct" in m
        assert "thermal_max_c" in m
        assert "detections" in m
        assert len(m["detections"]) > 0

        # Check YOLO detection attributes
        det = m["detections"][0]
        assert "label" in det
        assert "confidence" in det
        assert "bbox" in det
        assert len(det["bbox"]) == 4
        assert det["source_channel"] in ["RGB_OPTICAL", "THERMAL_INFRARED"]


@pytest.mark.asyncio
async def test_submit_drone_verification():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "cell_id": "OKI_GRID_36794",
            "verification_status": "confirmed_fire_smoke",
            "pilot_team": "Manggala Agni Daops OKI Regu Cengal",
            "notes": "Asap gambut tebal dan bara bawah permukaan terdeteksi pada kedalaman 30 cm.",
            "coordinates": {"lat": -3.4149, "lon": 105.8507},
        }
        response = await ac.post("/api/drone/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "SUCCESS"
        assert data["cell_id"] == "OKI_GRID_36794"
        assert data["verification_status"] == "confirmed_fire_smoke"
        assert data["queued_for_active_learning"] is True
        assert "VRF-" in data["verification_id"]
        assert "Siklus Belajar" in data["message"]


@pytest.mark.asyncio
async def test_submit_drone_verification_false_alarm():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "cell_id": "OKI_GRID_28410",
            "verification_status": "false_alarm",
            "pilot_team": "Manggala Agni Daops OKI Regu Pedamaran",
            "notes": "Lahan basah bekas genangan, pantulan termal akibat seng atap pondok kebun.",
        }
        response = await ac.post("/api/drone/verify", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "SUCCESS"
        assert data["verification_status"] == "false_alarm"
        assert data["queued_for_active_learning"] is True
