"""Proactive Early Warning Alerting & Telegram webhook router (Feature F4 & n8n)."""

from fastapi import APIRouter
from app.models.schemas import AlertSimulationRequest, AlertSimulationResponse
from app.services import alert_service, telegram_service

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.post("/webhook/simulate", response_model=AlertSimulationResponse)
async def simulate_alert(request: AlertSimulationRequest) -> AlertSimulationResponse:
    """Simulate evaluation of high-risk cells and format Telegram digest for n8n automation."""
    result = alert_service.simulate_alert_digest(request)
    if request.dispatch_telegram:
        dispatched = await telegram_service.send_telegram_alert(
            message=result.telegram_digest,
            chat_id=request.chat_id,
        )
        result.dispatched = dispatched
    return result
