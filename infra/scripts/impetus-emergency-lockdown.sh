#!/bin/bash
# IMPETUS — Lockdown de emergência: tira app + API + painel do ar (PM2 stop).
# Uso: impetus-emergency-lockdown.sh "MOTIVO" "detalhe opcional"
set -euo pipefail

CONFIG="${IMPETUS_THREAT_CONFIG:-/etc/impetus/threat-watch.env}"
LOCKDOWN_DIR="/var/lib/impetus/lockdown"
STATE_FILE="$LOCKDOWN_DIR/active.json"
LOG="/var/log/impetus-threat-watch.log"
REASON="${1:-BREACH_MULTI_LAYER}"
DETAIL="${2:-Lockdown automático por detecção crítica}"

mkdir -p "$LOCKDOWN_DIR"

if [[ -f "$STATE_FILE" ]]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] LOCKDOWN skip — já activo" | tee -a "$LOG"
  exit 0
fi

if [[ -f "$CONFIG" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG"
fi

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
HOST=$(hostname -s 2>/dev/null | tr -cd 'a-zA-Z0-9-' || echo impetus)

python3 - "$STATE_FILE" "$TS" "$REASON" "$DETAIL" "$HOST" <<'PY'
import json, sys
path, ts, reason, detail, host = sys.argv[1:6]
doc = {
  "schema": "impetus_lockdown_v1",
  "active": True,
  "started_at": ts,
  "reason": reason,
  "detail": detail,
  "host": host,
  "services": ["impetus-backend", "impetus-frontend", "impetus-admin-portal"],
  "restore_cmd": "sudo bash /var/www/impetus-completa/infra/scripts/impetus-emergency-restore.sh"
}
with open(path, "w") as f:
  json.dump(doc, f, indent=2)
PY

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"; }

log "LOCKDOWN INICIADO — $REASON — $DETAIL"

if command -v pm2 >/dev/null 2>&1; then
  pm2 stop impetus-backend impetus-frontend impetus-admin-portal 2>/dev/null || true
  log "PM2 stop: backend + frontend + admin-portal"
else
  log "WARN pm2 não encontrado"
fi

# Mensagem WhatsApp (Gustavo + Welligton)
if [[ -f "$CONFIG" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG"
fi

CALLMEBOT_UA="${IMPETUS_CALLMEBOT_UA:-Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36}"
sanitize_wa_msg() {
  local m="$1"
  m="${m//\/.env/ dotenv}"
  m="${m//\/.git/ dotgit}"
  m="${m//INVASION/invasao}"
  printf '%s' "$m"
}

callmebot_send() {
  local phone_e="$1" enc="$2" apikey="$3"
  curl -sS -m 25 -A "$CALLMEBOT_UA" -o /dev/null \
    "https://api.callmebot.com/whatsapp.php?phone=${phone_e}&text=${enc}&apikey=${apikey}" || true
}

send_lockdown_whatsapp() {
  local recipients="${IMPETUS_WHATSAPP_RECIPIENTS:-}"
  [[ -z "$recipients" ]] && return 0
  local msg
  msg=$(sanitize_wa_msg "IMPETUS FORA DO AR
Tentativa critica de invasao
Motivo: $REASON
$DETAIL
Software offline agora
Para voltar: impetus-emergency-restore no servidor
srv $HOST")
  local enc
  enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1][:1600]))" "$msg")
  local IFS=,
  for pair in $recipients; do
    local phone="${pair%%:*}" apikey="${pair#*:}"
    [[ -z "$phone" || -z "$apikey" || "$apikey" == "PENDENTE" ]] && continue
    local phone_e
    phone_e=$(python3 -c "import re,sys; print(re.sub(r'[^0-9]','',sys.argv[1]))" "$phone")
    callmebot_send "$phone_e" "$enc" "$apikey"
    sleep 2
  done
  log "WhatsApp lockdown enviado"
}

send_lockdown_whatsapp

log "LOCKDOWN COMPLETO — aguardar restore manual ou impetus-emergency-restore.sh"
