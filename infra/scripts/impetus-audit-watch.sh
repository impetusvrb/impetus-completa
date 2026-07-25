#!/bin/bash
# IMPETUS OPS — Alerta WhatsApp/webhook quando auditd regista deleções/comandos críticos.
set -euo pipefail

CONFIG="${IMPETUS_THREAT_CONFIG:-/etc/impetus/threat-watch.env}"
STATE_DIR="/var/lib/impetus/audit-watch"
LOG="/var/log/impetus-audit-watch.log"
SINCE_MIN="${IMPETUS_AUDIT_WATCH_SINCE_MIN:-4}"

mkdir -p "$STATE_DIR"
touch "$LOG"

if [[ -f "$CONFIG" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG"
fi

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"; }

if ! command -v ausearch >/dev/null 2>&1; then
  log "SKIP — auditd/ausearch não instalado"
  exit 0
fi

KEYS="impetus_delete,impetus_env,impetus_exec_rm,impetus_exec_rsync,impetus_exec_git,impetus_repo_write"
START_TS=$(date -u -d "${SINCE_MIN} minutes ago" '+%m/%d/%Y %H:%M:%S' 2>/dev/null || date -u -v-"${SINCE_MIN}"M '+%m/%d/%Y %H:%M:%S' 2>/dev/null || echo "today")

RAW=$(ausearch -k "$KEYS" --start "$START_TS" -i 2>/dev/null || true)
# Só alertar: DELETE no repo, .env, ou exec rm/rsync/git
RAW=$(printf '%s\n' "$RAW" | awk '
  /^----$/ { block=$0; buf=""; next }
  { buf = buf $0 "\n" }
  /^type=SYSCALL/ {
    if (buf ~ /key=impetus_delete|key=impetus_env|key=impetus_exec_/ || buf ~ /nametype=DELETE.*impetus_repo_write|nametype=DELETE.*key=impetus_repo_write/) {
      print block; print buf; print "----"
    }
    buf=""
  }
' )
[[ -z "$RAW" ]] && exit 0

# Dedup por hash do evento
EVENT_HASH=$(printf '%s' "$RAW" | sha256sum | awk '{print $1}')
LAST_HASH_FILE="$STATE_DIR/last_event_hash"
if [[ -f "$LAST_HASH_FILE" ]] && [[ "$(cat "$LAST_HASH_FILE")" == "$EVENT_HASH" ]]; then
  exit 0
fi
echo "$EVENT_HASH" > "$LAST_HASH_FILE"

SUMMARY=$(printf '%s\n' "$RAW" | grep -E '^(type=|msg=audit|uid=|auid=|exe=|comm=|name=)' | head -24 | tr '\n' ' ' | cut -c1-900)

INCIDENT_DIR="/var/lib/impetus/incidents"
mkdir -p "$INCIDENT_DIR"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
ID=$(date -u +%Y%m%dT%H%M%SZ)-audit
FILE="$INCIDENT_DIR/${ID}.json"
python3 - "$FILE" "$TS" "$SUMMARY" <<'PY'
import json, sys
path, ts, summary = sys.argv[1:4]
doc = {
  "schema": "impetus_audit_alert_v1",
  "timestamp_utc": ts,
  "severity": "CRITICAL",
  "category": "AUDIT_DESTRUCTIVE",
  "source_ip": "local",
  "detail": summary,
  "actions": ["auditd_logged", "whatsapp_if_configured"],
  "cursor_prompt": f"AUDITD IMPETUS: evento destrutivo/segredo. {summary[:500]}. ausearch -k impetus_delete --start recent"
}
with open(path, "w") as f:
  json.dump(doc, f, indent=2, ensure_ascii=False)
print(path)
PY
ln -sf "$FILE" "$INCIDENT_DIR/latest-audit.json"

log "ALERT AUDIT_DESTRUCTIVE — ${SUMMARY:0:200}"

# WhatsApp (reutiliza padrão threat-watch)
CALLMEBOT_UA="${IMPETUS_CALLMEBOT_UA:-Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36}"
WA_COOLDOWN="${IMPETUS_WHATSAPP_COOLDOWN_SEC:-600}"
COOLDOWN_FILE="$STATE_DIR/wa_cooldown"
now=$(date +%s)
last=0
[[ -f "$COOLDOWN_FILE" ]] && last=$(cat "$COOLDOWN_FILE" 2>/dev/null || echo 0)
if (( now - last < WA_COOLDOWN )); then
  log "WhatsApp cooldown activo"
  exit 0
fi

recipients="${IMPETUS_WHATSAPP_RECIPIENTS:-}"
[[ -z "$recipients" ]] && exit 0

msg="IMPETUS AUDITD CRITICO
Evento destrutivo ou .env
$(hostname -s 2>/dev/null || echo srv)
${SUMMARY:0:400}"
enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1][:1500]))" "$msg")
IFS=,
sent=0
for pair in $recipients; do
  phone="${pair%%:*}" apikey="${pair#*:}"
  [[ -z "$phone" || -z "$apikey" || "$apikey" == "PENDENTE" ]] && continue
  phone_e=$(python3 -c "import re,sys; print(re.sub(r'[^0-9]','',sys.argv[1]))" "$phone")
  code=$(curl -sS -m 20 -A "$CALLMEBOT_UA" -o /tmp/impetus-audit-wa.out -w "%{http_code}" \
    "https://api.callmebot.com/whatsapp.php?phone=${phone_e}&text=${enc}&apikey=${apikey}" || echo "000")
  if [[ "$code" == "200" || "$code" == "209" || "$code" == "210" ]]; then
    log "WhatsApp OK → $phone"
    sent=1
  fi
  sleep 2
done
(( sent )) && echo "$now" > "$COOLDOWN_FILE"

if [[ -n "${IMPETUS_ALERT_WEBHOOK_URL:-}" ]]; then
  curl -fsS -m 15 -X POST -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys; print(json.dumps({'severity':'CRITICAL','category':'AUDIT_DESTRUCTIVE','detail':sys.argv[1]}))" "$SUMMARY")" \
    "$IMPETUS_ALERT_WEBHOOK_URL" >/dev/null 2>&1 || true
fi
