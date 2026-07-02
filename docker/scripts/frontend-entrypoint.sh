#!/usr/bin/env bash
# Entrypoint Frontend — PM2 Runtime (runtime oficial certificado)
# CERT-ONPREM-CONTAINER-01
set -euo pipefail

export IMPETUS_HOME="${IMPETUS_HOME:-/opt/impetus}"
export PM2_HOME="${PM2_HOME:-/opt/impetus/runtime/pm2-frontend}"
export NODE_ENV="${NODE_ENV:-production}"

mkdir -p "$PM2_HOME" "${IMPETUS_HOME}/logs/frontend" 2>/dev/null || true

echo "[entrypoint] frontend PM2 Runtime IMPETUS_HOME=$IMPETUS_HOME"

exec pm2-runtime start /app/docker/ecosystem.frontend.container.cjs --env production
