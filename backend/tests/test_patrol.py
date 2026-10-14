"""Tests for Dynamic Patrol Priority Ranking (Top-k) API endpoints (Feature F2)."""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_top_k_patrol_sorting():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/patrol/top-k?k=10")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 10
        assert data["k"] == 10

        # Verify descending sort order
        scores = [item["risk_score"] for item in data["results"]]
        assert scores == sorted(scores, reverse=True)

        # Verify score bounds and schema
        for item in data["results"]:
            assert 0.0 <= item["risk_score"] <= 1.0
            assert item["risk_category"] in ["Bahaya", "Siaga", "Waspada"]
            assert "cell_id" in item
            assert "khg_id" in item
            assert "lon" in item and "lat" in item
            assert "distance_to_road_m" in item
            assert "distance_to_waterway_m" in item
            assert "access_distance_m" in item


@pytest.mark.asyncio
async def test_top_k_resource_constraint():
    """Verify resource-constrained DSS behavior matching 11-16 Daops Manggala Agni patrol teams."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        for team_count in [11, 16]:
            response = await ac.get(f"/api/patrol/top-k?k={team_count}")
            assert response.status_code == 200
            data = response.json()
            assert len(data["results"]) == team_count
            assert data["k"] == team_count

            scores = [item["risk_score"] for item in data["results"]]
            assert scores == sorted(scores, reverse=True)


@pytest.mark.asyncio
async def test_top_k_accessibility_filter():
    """Verify that max_access_distance_m properly bounds the patrol accessibility."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        max_dist = 5000.0  # 5 km threshold for foot/boat deployment
        response = await ac.get(f"/api/patrol/top-k?k=10&max_access_distance_m={max_dist}")
        assert response.status_code == 200
        data = response.json()
        for item in data["results"]:
            assert item["access_distance_m"] <= max_dist


@pytest.mark.asyncio
async def test_top_k_patrol_filtering_by_khg():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        khg = "KHG_SUGIHAN_LUMPUR"
        response = await ac.get(f"/api/patrol/top-k?k=5&khg_id={khg}")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) <= 5
        for item in data["results"]:
            assert item["khg_id"] == khg


@pytest.mark.asyncio
async def test_top_k_patrol_invalid_k():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # k must be between 1 and 100
        response = await ac.get("/api/patrol/top-k?k=0")
        assert response.status_code == 422

        response = await ac.get("/api/patrol/top-k?k=101")
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_top_k_patrol_csv_export():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/patrol/top-k/export?k=15")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        assert "attachment" in response.headers.get("content-disposition", "")
        assert "oki_patrol_top_k.csv" in response.headers.get("content-disposition", "")

        lines = response.text.strip().split("\n")
        # 1 header line + 15 data lines
        assert len(lines) == 16
        headers = lines[0].split(",")
        assert "cell_id" in headers
        assert "risk_score" in headers
        assert "lon" in headers
        assert "lat" in headers
        assert "distance_to_road_m" in headers
        assert "access_distance_m" in headers
