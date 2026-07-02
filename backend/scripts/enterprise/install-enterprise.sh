#!/usr/bin/env bash
# IMPETUS Enterprise — instalação oficial (CERT-ONPREM-DATA-01)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/impetus-home.sh
source "$SCRIPT_DIR/lib/impetus-home.sh"

REPO_ROOT="$(cd "$BACKEND_DIR/.." && pwd)"
echo "=== IMPETUS Enterprise Install ==="
echo "IMPETUS_HOME=${IMPETUS_HOME:-legacy}"
echo "BACKEND=$BACKEND_DIR"

mkdir -p "${IMPETUS_HOME}/config" "${IMPETUS_HOME}/uploads" "${IMPETUS_HOME}/data" \
  "${IMPETUS_HOME}/backups" "${IMPETUS_HOME}/logs" "${IMPETUS_HOME}/licenses" \
  "${IMPETUS_HOME}/certificates" "${IMPETUS_HOME}/temp" "${IMPETUS_HOME}/runtime" 2>/dev/null || true

if [[ -f "$BACKEND_DIR/.env" && ! -f "${IMPETUS_HOME}/config/.env" && -d "${IMPETUS_HOME}/config" ]]; then
  if [[ "$IMPETUS_HOME" != "$REPO_ROOT" ]]; then
    echo "[install] Copiar .env legado → ${IMPETUS_HOME}/config/.env (manual review recomendado)"
    cp -n "$BACKEND_DIR/.env" "${IMPETUS_HOME}/config/.env" 2>/dev/null || true
  fi
fi

echo "[1/5] npm ci backend..."
(cd "$BACKEND_DIR" && npm ci --omit=dev 2>/dev/null || npm install --omit=dev)

echo "[2/5] migrations..."
(cd "$BACKEND_DIR" && node scripts/run-all-migrations.js)

echo "[3/5] verify layout..."
(cd "$BACKEND_DIR" && node scripts/enterprise/verify-enterprise.js)

if [[ -z "${ENTERPRISE_BOOTSTRAP_ADMIN_PASSWORD:-}" ]]; then
  echo "[4/5] bootstrap SKIP — defina ENTERPRISE_BOOTSTRAP_ADMIN_PASSWORD para BD vazia"
else
  echo "[4/5] bootstrap (se BD vazia)..."
  (cd "$BACKEND_DIR" && node scripts/enterprise/bootstrap-enterprise.js) || true
fi

echo "[5/5] smoke (se backend online)..."
if curl -sf "http://127.0.0.1:${PORT:-4000}/health" >/dev/null 2>&1; then
  (cd "$BACKEND_DIR" && node scripts/ops/smoke-clean-install.js) || echo "  AVISO: smoke falhou"
else
  echo "  backend offline — iniciar PM2 e executar health-enterprise.sh"
fi

echo "=== Instalação Enterprise concluída ==="
echo "Docs: backend/docs/CERT-ONPREM-DATA-01.md"
