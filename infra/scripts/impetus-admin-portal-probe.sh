#!/bin/bash
# IMPETUS Equipa — probe de segurança + alerta WhatsApp
set -euo pipefail

ROOT="/var/www/impetus-completa"
CONFIG="${IMPETUS_THREAT_CONFIG:-/etc/impetus/threat-watch.env}"
LOG="/var/log/impetus-admin-portal-probe.log"
PROBE_JSON="$ROOT/backend/docs/evidence/admin-portal-security/probe-latest.json"

mkdir -p "$(dirname "$LOG")"
exec > >(tee -a "$LOG") 2>&1

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Início probe painel equipe IMPETUS"

cd "$ROOT/backend"
set +e
node src/securityApplicationValidation/adminPortalSecurityProbe.js
PROBE_EXIT=$?
set -e

if [[ ! -f "$PROBE_JSON" ]]; then
  echo "ERRO: relatório não gerado"
  exit 1
fi

SUMMARY=$(python3 - <<'PY' "$PROBE_JSON"
import json, sys
r = json.load(open(sys.argv[1]))
s = r["summary"]
lines = [
  "IMPETUS Equipa - Teste Seguranca",
  f"Data: {r['generated_at'][:19]}Z",
  f"Score: {s['score']}",
  f"PASS {s['pass']}/{s['total']} FAIL {s['fail']} WARN {s['warn']}",
  "",
  "Probes:"
]
for x in r["results"]:
    icon = "OK" if x["verdict"] == "PASS" else ("!!" if x["verdict"] == "WARN" else "XX")
    lines.append(f"{icon} {x['id']} {x['title']}")
lines.append("")
lines.append("Painel: srv1422313.hstgr.cloud/painel")
print("\n".join(lines))
PY
)

if [[ -f "$CONFIG" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG"
fi

send_whatsapp() {
  local msg="$1"
  local recipients="${IMPETUS_WHATSAPP_RECIPIENTS:-}"
  [[ -z "$recipients" ]] && { echo "WhatsApp: sem destinatários configurados"; return 0; }
  local enc
  enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1][:1600]))" "$msg")
  local CALLMEBOT_UA="${IMPETUS_CALLMEBOT_UA:-Mozilla/5.0}"
  local IFS=,
  for pair in $recipients; do
    local phone="${pair%%:*}" apikey="${pair#*:}"
    [[ -z "$phone" || -z "$apikey" || "$apikey" == "PENDENTE" ]] && continue
    local phone_e
    phone_e=$(python3 -c "import re,sys; print(re.sub(r'[^0-9]','',sys.argv[1]))" "$phone")
    code=$(curl -sS -m 25 -A "$CALLMEBOT_UA" -o /tmp/impetus-wa-probe.out -w "%{http_code}" \
      "https://api.callmebot.com/whatsapp.php?phone=${phone_e}&text=${enc}&apikey=${apikey}" || echo "000")
    if grep -qi 'ERROR:' /tmp/impetus-wa-probe.out 2>/dev/null; then
      echo "WhatsApp ERRO → $phone_e: $(head -1 /tmp/impetus-wa-probe.out)"
    elif [[ "$code" == "200" || "$code" == "209" || "$code" == "210" ]]; then
      echo "WhatsApp OK → $phone_e (HTTP $code)"
    else
      echo "WhatsApp falhou → $phone_e (HTTP $code)"
    fi
    sleep 2
  done
}

echo "--- Resumo ---"
echo "$SUMMARY"
send_whatsapp "$SUMMARY"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Probe concluído exit=$PROBE_EXIT"
exit "$PROBE_EXIT"
