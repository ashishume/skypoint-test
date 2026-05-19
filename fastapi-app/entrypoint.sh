#!/bin/sh
set -e

echo "[entrypoint] Waiting for database..."
python - <<'PY'
import os
import sys
import time

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

database_url = os.environ["DATABASE_URL"]
deadline = time.time() + int(os.environ.get("DB_STARTUP_TIMEOUT_SECONDS", "60"))
engine = create_engine(database_url, pool_pre_ping=True)

while True:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        print("[entrypoint] Database is ready.")
        break
    except OperationalError as exc:
        if time.time() >= deadline:
            print(f"[entrypoint] Database did not become ready in time: {exc}", file=sys.stderr)
            raise
        print("[entrypoint] Database is not ready yet; retrying...")
        time.sleep(2)
    finally:
        engine.dispose()
PY

echo "[entrypoint] Running database migrations..."
alembic upgrade head

echo "[entrypoint] Running idempotent seed..."
python -m app.seed

WORKERS="${UVICORN_WORKERS:-2}"
echo "[entrypoint] Starting Uvicorn with ${WORKERS} worker(s)..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers "${WORKERS}" \
    --proxy-headers \
    --forwarded-allow-ips='*'
