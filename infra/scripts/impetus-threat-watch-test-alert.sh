#!/bin/bash
# Envia alerta de TESTE (sem ban UFW) para validar WhatsApp.
set -euo pipefail

CONFIG="${IMPETUS_THREAT_CONFIG:-/etc/impetus/threat-watch.env}"
LOG="/var/log/impetus-threat-watch.log"

if [[ -f "$CONFIG" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG"
fi

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] TEST $*" | tee -a "$LOG"; }

CALLMEBOT_UA="${IMPETUS_CALLMEBOT_UA:-Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36}"

callmebot_phone_encoded() {
  python3 -c "import re,sys; p=re.sub(r'[^0-9]','',sys.argv[1]); print(p)" "$1"
}

callmebot_curl_ok() {
  local code
  code=$(curl -sS -m 15 -A "$CALLMEBOT_UA" -o /tmp/impetus-wa-test.out -w "%{http_code}" "$1")
  [[ "$code" == "200" || "$code" == "210" ]]
}

send_whatsapp() {
  local msg="$1"
  local enc
  enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1][:1800]))" "$msg")
  local recipients="${IMPETUS_WHATSAPP_RECIPIENTS:-}"
  local sent=0 failed=0

  if [[ -n "$recipients" ]]; then
    local IFS=,
    for pair in $recipients; do
      local phone="${pair%%:*}" apikey="${pair#*:}"
      if [[ -z "$phone" || -z "$apikey" || "$apikey" == "PENDENTE" || "$apikey" == "$phone" ]]; then
        log "SKIP $phone — apikey em falta (registar CallMeBot)"
        continue
      fi
      local phone_e
      phone_e=$(callmebot_phone_encoded "$phone")
      [[ -z "$phone_e" ]] && continue
      if callmebot_curl_ok "https://api.callmebot.com/whatsapp.php?phone=${phone_e}&text=${enc}&apikey=${apikey}"; then
        log "WhatsApp TEST OK → $phone"
        sent=$((sent + 1))
      else
        log "WhatsApp TEST FAIL → $phone (HTTP/body: $(head -c 80 /tmp/impetus-wa-test.out 2>/dev/null))"
        failed=$((failed + 1))
      fi
    done
    echo "Enviados: $sent | Falhas: $failed | Ignorados (sem apikey): ver log"
    [[ "$sent" -eq 0 ]] && echo "Se falhou com 403: teste o link no telemóvel ou envie Resume ao bot CallMeBot" && exit 2
    return 0
  fi

  local phone="${IMPETUS_WHATSAPP_PHONE:-}"
  local apikey="${IMPETUS_WHATSAPP_APIKEY:-}"
  if [[ -z "$phone" || -z "$apikey" ]]; then
    echo "Configure IMPETUS_WHATSAPP_RECIPIENTS em $CONFIG"
    exit 1
  fi
  curl -fsS -m 15 "https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${enc}&apikey=${apikey}"
}

MSG="${1:-IMPETUS ALERTA TESTE
Severidade: TEST
IP simulado: 203.0.113.99
Probe dotenv (simulacao)
Srv: impetus-prod}"

log "Disparando alerta de teste..."
send_whatsapp "$MSG"
