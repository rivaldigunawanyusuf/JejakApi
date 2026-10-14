FROM python:3.11-slim

WORKDIR /app

# Install build dependencies for c-extensions if needed
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential curl && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and pre-computed risk data
COPY app/ ./app/
COPY data/ ./data/

EXPOSE 8000

ENV PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    FASTAPI_PORT=8000 \
    DATA_PARQUET_PATH=/app/data/oki_risk_latest.parquet

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
