#!/usr/bin/env bash
# Aguarda PostgreSQL — CERT-ONPREM-CONTAINER-01
set -euo pipefail

HOST="${DB_HOST:-postgres}"
PORT="${DB_PORT:-5432}"
USER="${DB_USER:-impetus_app}"
MAX="${DB_WAIT_MAX_SECONDS:-120}"

echo "[wait-for-postgres] host=$HOST port=$PORT user=$USER max=${MAX}s"

for ((i=1; i<=MAX; i++)); do
  if pg_isready -h "$HOST" -p "$PORT" -U "$USER" >/dev/null 2>&1; then
    echo "[wait-for-postgres] ready (${i}s)"
    exit 0
  fi
  sleep 1
done

echo "[wait-for-postgres] timeout após ${MAX}s" >&2
exit 1
