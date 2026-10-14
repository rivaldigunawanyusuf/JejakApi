"""Telegram Bot integration service for early warning dispatch (Feature F4)."""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.core import config

logger = logging.getLogger(__name__)


async def send_telegram_alert(
    message: str,
    chat_id: Optional[str] = None,
    bot_token: Optional[str] = None,
) -> bool:
    """Send markdown-formatted risk alert message to Telegram Bot channel/chat."""
    token = bot_token or config.TELEGRAM_BOT_TOKEN
    target_chat = chat_id or config.os.getenv("TELEGRAM_CHAT_ID", "")

    if not token or not target_chat:
        logger.info(
            "Telegram bot token or chat ID not set. Skipping live delivery (dry-run)."
        )
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": target_chat,
        "text": message,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                logger.info(f"Successfully dispatched alert to Telegram chat {target_chat}")
                return True
            else:
                logger.error(
                    f"Telegram API responded with {response.status_code}: {response.text}"
                )
                return False
    except Exception as exc:
        logger.error(f"Failed to deliver alert to Telegram: {exc}")
        return False
