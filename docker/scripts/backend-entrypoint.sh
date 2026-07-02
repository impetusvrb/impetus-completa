#!/usr/bin/env bash
# Entrypoint Backend — init idempotente + PM2 Runtime (runtime oficial certificado)
# CERT-ONPREM-CONTAINER-01
set -euo pipefail

cd /app/backend

export IMPETUS_HOME="${IMPETUS_HOME:-/opt/impetus}"
export NODE_ENV="${NODE_ENV:-production}"
export PM2_HOME="${PM2_HOME:-/opt/impetus/runtime/pm2-backend}"

mkdir -p "$PM2_HOME" "${IMPETUS_HOME}/logs/backend" 2>/dev/null || true

echo "[entrypoint] IMPETUS_HOME=$IMPETUS_HOME PM2_HOME=$PM2_HOME"

# 1. Verificar configuração
if [[ ! -f "${IMPETUS_HOME}/config/.env" ]]; then
  echo "[entrypoint] AVISO: ${IMPETUS_HOME}/config/.env ausente — usar template docker/config/env.enterprise.example"
fi

# Garantir árvore de persistência (script certificado DATA-01 — sem alteração)
node -e "require('./src/config/impetusHome').ensureEnterpriseDirs()"

# PostgreSQL
if [[ "${IMPETUS_SKIP_DB_WAIT:-false}" != "true" ]]; then
  wait-for-postgres.sh
fi

# 2. Migrations (script certificado — sem alteração)
if [[ "${IMPETUS_SKIP_MIGRATIONS:-false}" != "true" ]]; then
  echo "[entrypoint] migrations..."
  node scripts/run-all-migrations.js
fi

# 3. Bootstrap condicional (script certificado — aborta se BD populada)
if [[ -n "${ENTERPRISE_BOOTSTRAP_ADMIN_PASSWORD:-}" && "${IMPETUS_SKIP_BOOTSTRAP:-false}" != "true" ]]; then
  echo "[entrypoint] bootstrap (condicional)..."
  node scripts/enterprise/bootstrap-enterprise.js || true
fi

# 4. Licença (script certificado LICENSE-01)
if [[ "${IMPETUS_SKIP_LICENSE_CHECK:-false}" != "true" ]]; then
  node scripts/enterprise/license-admin.js status >/dev/null 2>&1 \
    && echo "[entrypoint] licença consultada" \
    || echo "[entrypoint] licença: skip ou indisponível"
fi

# 5. Health pre-PM2 (migrations/bootstrap concluídos)
echo "[entrypoint] init concluído — iniciando PM2 Runtime (runtime oficial)"

# 6. PM2 Runtime — mesmo process manager certificado em INFRA-01
exec pm2-runtime start /app/docker/ecosystem.backend.container.cjs --env production
