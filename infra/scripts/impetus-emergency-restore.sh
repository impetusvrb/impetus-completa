#!/bin/bash
# IMPETUS — Restaura software após lockdown de emergência.
# Uso: sudo bash infra/scripts/impetus-emergency-restore.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONFIG="${IMPETUS_THREAT_CONFIG:-/etc/impetus/threat-watch.env}"
LOCKDOWN_DIR="/var/lib/impetus/lockdown"
STATE_FILE="$LOCKDOWN_DIR/active.json"
LOG="/var/log/impetus-threat-watch.log"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"; }

if [[ -f "$CONFIG" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG"
fi

HOST=$(hostname -s 2>/dev/null | tr -cd 'a-zA-Z0-9-' || echo impetus)

if command -v pm2 >/dev/null 2>&1; then
  (cd "$ROOT" && pm2 startOrRestart ecosystem.runtime.config.cjs --env production --update-env)
  log "PM2 restore: backend + frontend + admin-portal"
fi

if [[ -f "$STATE_FILE" ]]; then
  mv "$STATE_FILE" "$LOCKDOWN_DIR/last-restored-$(date -u +%Y%m%dT%H%M%SZ).json" 2>/dev/null || rm -f "$STATE_FILE"
fi

rm -rf /var/lib/impetus/breach-watch/layers 2>/dev/null || true

recipients="${IMPETUS_WHATSAPP_RECIPIENTS:-}"
if [[ -n "$recipients" ]]; then
  msg="IMPETUS ONLINE
Software restaurado apos lockdown
srv $HOST"
  enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1][:800]))" "$msg")
  IFS=,
  for pair in $recipients; do
    phone="${pair%%:*}"; apikey="${pair#*:}"
    [[ -z "$phone" || -z "$apikey" ]] && continue
    phone_e=$(python3 -c "import re,sys; print(re.sub(r'[^0-9]','',sys.argv[1]))" "$phone")
    curl -sS -m 20 -o /dev/null \
      "https://api.callmebot.com/whatsapp.php?phone=${phone_e}&text=${enc}&apikey=${apikey}" || true
    sleep 1
  done
fi

log "RESTORE COMPLETO"
