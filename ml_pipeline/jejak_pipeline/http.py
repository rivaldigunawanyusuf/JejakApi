"""Minimal HTTP helpers (stdlib only) with retries and exponential backoff."""

from __future__ import annotations

import time
import urllib.error
import urllib.request

USER_AGENT = "jejak-api-pipeline/0.1 (+hackathon JOINTS UGM 2026)"


def get_text(
    url: str, retries: int = 3, backoff: float = 2.0, timeout: float = 120.0
) -> str:
    """GET ``url`` and return the decoded body, retrying transient failures."""
    return _request(url, None, retries, backoff, timeout)


def post_form(
    url: str,
    data: bytes,
    retries: int = 3,
    backoff: float = 5.0,
    timeout: float = 600.0,
) -> str:
    """POST form-encoded ``data`` and return the decoded body."""
    return _request(url, data, retries, backoff, timeout)


def _request(
    url: str, data: bytes | None, retries: int, backoff: float, timeout: float
) -> str:
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url, data=data, headers={"User-Agent": USER_AGENT}
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read().decode("utf-8")
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            last_error = exc
            if attempt < retries - 1:
                time.sleep(backoff * (2**attempt))
    # Never include the URL: it may embed an API key (e.g. FIRMS MAP_KEY).
    raise ConnectionError(f"request failed after {retries} attempts: {last_error}")
