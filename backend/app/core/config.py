"""Configuration settings for JEJAK API backend."""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DATA_PATH = BACKEND_DIR / "data" / "oki_risk_latest.parquet"

# Environment variables
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DATA_PARQUET_PATH = Path(os.getenv("DATA_PARQUET_PATH", str(DEFAULT_DATA_PATH)))
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
FASTAPI_PORT = int(os.getenv("FASTAPI_PORT", "8000"))
NASA_FIRMS_MAP_KEY = os.getenv("NASA_FIRMS_MAP_KEY") or os.getenv("FIRMS_MAP_KEY") or ""

# Allowed CORS origins
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
]
if os.getenv("FRONTEND_URL"):
    CORS_ORIGINS.append(os.getenv("FRONTEND_URL"))
