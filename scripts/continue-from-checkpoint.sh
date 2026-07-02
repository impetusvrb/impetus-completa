#!/usr/bin/env bash
# IMPETUS — Continuar do checkpoint IECP (P0E + CERT-04 seed IOE)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
log() { printf '[checkpoint] %s\n' "$*"; }

log "Patch .env produção industrial..."
node "$ROOT/scripts/patch-env-industrial-production.js"

log "PM2 restart production..."
pm2 restart ecosystem.config.js --env production --update-env

log "Aguardar backend (15s)..."
sleep 15
curl -sf --max-time 10 http://127.0.0.1:4000/health >/dev/null || { log "ERRO: health fail"; exit 1; }

log "Seed primeiro IOE (CERT-04)..."
(cd "$ROOT/backend" && node scripts/audit/seed_first_ioe_cert04.js)

log "P0E go-live monitoring..."
(cd "$ROOT/backend" && node scripts/p0e_go_live_monitoring.js)

log "CERT drift..."
(cd "$ROOT/backend" && npm run cert:drift)

log "Checkpoint concluído."
