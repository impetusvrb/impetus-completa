#!/usr/bin/env bash
# IMPETUS — deploy único: migrations (opcional) + backend + build frontend + frontend
# Uso: bash scripts/deploy-impetus.sh [--skip-migrate] [--skip-build] [--backend-only] [--frontend-only]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_MIGRATE=0
SKIP_BUILD=0
BACKEND_ONLY=0
FRONTEND_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --skip-migrate) SKIP_MIGRATE=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --backend-only) BACKEND_ONLY=1 ;;
    --frontend-only) FRONTEND_ONLY=1 ;;
    -h|--help)
      echo "Uso: $0 [--skip-migrate] [--skip-build] [--backend-only] [--frontend-only]"
      exit 0
      ;;
    *) echo "Opção desconhecida: $arg" >&2; exit 1 ;;
  esac
done

log() { printf '[deploy] %s\n' "$*"; }

reload_pm2() {
  local name="$1"
  if command -v pm2 >/dev/null 2>&1; then
    pm2 reload "$name" --update-env || pm2 restart "$name" --update-env
    log "PM2: $name recarregado"
  else
    log "AVISO: pm2 não encontrado — reinicie $name manualmente"
  fi
}

if [[ "$FRONTEND_ONLY" -eq 0 ]]; then
  if [[ "$SKIP_MIGRATE" -eq 0 ]]; then
    log "Migrations (backend)..."
    (cd "$ROOT/backend" && npm run migrate)
  else
    log "Migrations ignoradas (--skip-migrate)"
  fi

  log "Backend reload..."
  reload_pm2 impetus-backend
fi

if [[ "$BACKEND_ONLY" -eq 0 ]]; then
  if [[ "$SKIP_BUILD" -eq 0 ]]; then
    log "Build frontend (pode demorar 1–3 min)..."
    (cd "$ROOT/frontend" && npm run build)
  else
    log "Build ignorado (--skip-build)"
  fi

  log "Frontend reload..."
  reload_pm2 impetus-frontend
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 list | grep -E 'impetus-(backend|frontend)' || true
fi

log "Deploy concluído."
