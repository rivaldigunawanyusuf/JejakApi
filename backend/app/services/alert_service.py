"""Early Warning Alerting & Telegram digest generation service (Feature F4 & n8n integration)."""

from __future__ import annotations

from typing import List

from app.core.database import db_engine
from app.models.schemas import AlertSimulationRequest, AlertSimulationResponse


def simulate_alert_digest(request: AlertSimulationRequest) -> AlertSimulationResponse:
    """Simulate proactive fire risk evaluation and Telegram digest generation for n8n cron."""
    # Fetch cells above threshold
    query = """
        SELECT 
            cell_id,
            risk_score,
            risk_category,
            khg_id,
            lon,
            lat,
            canal_density_km_km2,
            top_factor_1_name,
            top_factor_1_score,
            top_factor_1_narrative
        FROM oki_risk
        WHERE risk_score >= ?
    """
    params: List[object] = [request.risk_threshold]
    if request.khg_id:
        query += " AND khg_id = ?"
        params.append(request.khg_id)

    query += " ORDER BY risk_score DESC LIMIT 5"
    top_threats = db_engine.conn.execute(query, params).df().to_dict(orient="records")

    high_risk_count = len(top_threats)
    if high_risk_count >= 5:
        level = "BAHAYA"
        icon = "🔴"
    elif high_risk_count >= 2:
        level = "SIAGA"
        icon = "🟠"
    elif high_risk_count >= 1:
        level = "WASPADA"
        icon = "🟡"
    else:
        level = "AMAN"
        icon = "🟢"

    # Build structured Telegram markdown digest
    lines = [
        f"{icon} *[JEJAK API EARLY WARNING] - STATUS {level}*",
        f"📍 *Wilayah Target:* {request.target_area_name}",
    ]
    if request.khg_id:
        lines.append(f"🌊 *Kesatuan Hidrologis Gambut:* `{request.khg_id}`")

    lines.extend([
        f"🎯 *Ambang Risiko:* Probabilitas >= {request.risk_threshold * 100:.0f}%",
        f"⚠️ *Jumlah Sel Prioritas:* {high_risk_count} sel terdeteksi",
        "",
        "*📋 Rekomendasi Titik Rute Patroli Darat:*",
    ])

    if top_threats:
        for idx, t in enumerate(top_threats, start=1):
            cell_id = t["cell_id"]
            score = t["risk_score"]
            lon = t["lon"]
            lat = t["lat"]
            narrative = t["top_factor_1_narrative"]
            lines.append(
                f"{idx}. `{cell_id}` | Skor: *{score*100:.1f}%*\n"
                f"   • Koordinat: `{lat:.5f}, {lon:.5f}`\n"
                f"   • Indikator Kunci: {narrative}"
            )
    else:
        lines.append("• Tidak ditemukan anomali sel di atas ambang batas saat ini.")

    lines.extend([
        "",
        "ℹ️ *Catatan Operasional:*",
        "_Indikasi aktivitas pembukaan tutupan vegetasi dan kekeringan gambut berdasarkan citra satelit & model prediktif terbuka, memerlukan ground-check lapangan._",
    ])

    digest = "\n".join(lines)

    return AlertSimulationResponse(
        status="simulated",
        target_area=request.target_area_name,
        alert_level=level,
        high_risk_cells_count=high_risk_count,
        telegram_digest=digest,
    )
