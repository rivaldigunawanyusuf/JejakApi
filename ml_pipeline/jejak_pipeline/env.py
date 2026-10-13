"""Tiny .env loader (no extra dependency). Secrets never get logged."""

from __future__ import annotations

import os
from pathlib import Path


class MissingSettingError(RuntimeError):
    """Raised when a required setting is not configured."""


def parse_env_text(text: str) -> dict[str, str]:
    """Parse ``KEY=VALUE`` lines; ignores comments, blanks and malformed lines."""
    out: dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[len("export ") :]
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        if key:
            out[key] = value
    return out


def load_env(path: str | Path | None = None) -> None:
    """Load a ``.env`` into ``os.environ`` without overriding existing variables."""
    path = Path(path) if path else Path(__file__).resolve().parents[2] / ".env"
    if not path.is_file():
        return
    for key, value in parse_env_text(path.read_text()).items():
        os.environ.setdefault(key, value)


def require(name: str) -> str:
    """Return a required environment variable or raise with setup guidance."""
    value = os.environ.get(name, "").strip()
    if not value:
        raise MissingSettingError(
            f"{name} is not set. Add it to .env (see .env.example); "
            "never commit real values."
        )
    return value
