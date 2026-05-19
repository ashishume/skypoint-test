#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
alembic upgrade head

WORKERS="${UVICORN_WORKERS:-2}"
echo "[entrypoint] Starting Uvicorn with ${WORKERS} worker(s)..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers "${WORKERS}" \
    --proxy-headers \
    --forwarded-allow-ips='*'
