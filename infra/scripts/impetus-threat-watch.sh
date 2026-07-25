#!/bin/bash
# IMPETUS OPS — Detecção ampla de ameaças, ban UFW, alerta WhatsApp/webhook.
# Um único WhatsApp por ciclo (evita quota CallMeBot 16-48 msg/4h).
set -euo pipefail

CONFIG="${IMPETUS_THREAT_CONFIG:-/etc/impetus/threat-watch.env}"
STATE_DIR="/var/lib/impetus/threat-watch"
INCIDENT_DIR="/var/lib/impetus/incidents"
LOG="${IMPETUS_THREAT_WATCH_LOG:-/var/log/impetus-threat-watch.log}"
NGINX_ACCESS="${IMPETUS_NGINX_ACCESS:-/var/log/nginx/impetus-access.log}"
AUTH_LOG="${IMPETUS_AUTH_LOG:-/var/log/auth.log}"
QUEUE_FILE="$STATE_DIR/notify_queue.$$"

mkdir -p "$STATE_DIR" "$INCIDENT_DIR"
touch "$LOG"
: > "$QUEUE_FILE"

if [[ -f "$CONFIG" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG"
fi

AUTO_UFW_DENY="${IMPETUS_AUTO_UFW_DENY:-true}"
CF_WAF_CONFIG="${IMPETUS_CF_CONFIG:-/etc/impetus/cloudflare-waf.env}"
CF_WAF_PY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/cloudflare-waf-impetus.py"
AUTO_CF_BAN="${IMPETUS_CF_AUTO_BAN:-true}"
COOLDOWN="${IMPETUS_NOTIFY_COOLDOWN_SEC:-300}"
WA_COOLDOWN="${IMPETUS_WHATSAPP_COOLDOWN_SEC:-3600}"
WA_MIN_SEVERITY="${IMPETUS_WHATSAPP_MIN_SEVERITY:-CRITICAL}"
FLOOD_404_THRESH="${IMPETUS_404_FLOOD_THRESHOLD:-50}"
FLOOD_404_SILENT="${IMPETUS_404_FLOOD_SILENT:-true}"
NOTIFY_HTTP_WRITE="${IMPETUS_NOTIFY_HTTP_WRITE:-false}"
SSH_THRESH="${IMPETUS_SSH_FAIL_THRESHOLD:-3}"
HTTP_PROBE_THRESH="${IMPETUS_HTTP_PROBE_THRESHOLD:-2}"
TRUSTED="${IMPETUS_TRUSTED_CIDRS:-170.246.0.0/16,186.225.0.0/16,127.0.0.1,::1}"

# Motor lockdown multi-camada (Fase 2)
BREACH_ENGINE="/usr/local/bin/impetus-breach-lockdown-engine.sh"
[[ -f "$BREACH_ENGINE" ]] || BREACH_ENGINE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/impetus-breach-lockdown-engine.sh"
if [[ -f "$BREACH_ENGINE" ]]; then
  # shellcheck disable=SC1090
  source "$BREACH_ENGINE"
fi

severity_rank() {
  case "$1" in
    CRITICAL) echo 4 ;;
    HIGH) echo 3 ;;
    MEDIUM) echo 2 ;;
    LOW) echo 1 ;;
    *) echo 0 ;;
  esac
}

should_notify_whatsapp() {
  local sev="$1"
  local rank min_rank
  rank=$(severity_rank "$sev")
  min_rank=$(severity_rank "$WA_MIN_SEVERITY")
  (( rank >= min_rank ))
}

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"; }

is_trusted_ip() {
  local ip="$1"
  [[ "$ip" == "127.0.0.1" || "$ip" == "::1" ]] && return 0
  [[ "$ip" == 170.246.* ]] && return 0
  [[ "$ip" == 186.225.* ]] && return 0
  [[ "$ip" == 2804:2484:* ]] && return 0
  [[ "$ip" == 2804:2980:* ]] && return 0
  return 1
}

cooldown_ok() {
  local key="$1" secs="${2:-$COOLDOWN}"
  local f="$STATE_DIR/cooldown_${key//[^a-zA-Z0-9]/_}"
  local now last
  now=$(date +%s)
  last=0
  [[ -f "$f" ]] && last=$(cat "$f" 2>/dev/null || echo 0)
  if (( now - last < secs )); then
    return 1
  fi
  echo "$now" > "$f"
  return 0
}

CALLMEBOT_UA="${IMPETUS_CALLMEBOT_UA:-Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36}"

callmebot_phone_encoded() {
  python3 -c "import re,sys; p=re.sub(r'[^0-9]','',sys.argv[1]); print(p)" "$1"
}

callmebot_send() {
  local phone_e="$1" enc="$2" apikey="$3"
  local code
  code=$(curl -sS -m 20 -A "$CALLMEBOT_UA" -o /tmp/impetus-wa-last.out -w "%{http_code}" \
    "https://api.callmebot.com/whatsapp.php?phone=${phone_e}&text=${enc}&apikey=${apikey}")
  if grep -qi 'ERROR:' /tmp/impetus-wa-last.out 2>/dev/null; then
    local err
    err=$(grep -oiE 'ERROR:[^<]+' /tmp/impetus-wa-last.out | head -1 | tr -d '\n')
    log "CallMeBot $err → $phone_e"
    return 1
  fi
  [[ "$code" == "200" || "$code" == "209" || "$code" == "210" ]]
}

sanitize_wa_msg() {
  local m="$1"
  m="${m//\/.env/ dotenv}"
  m="${m//\/.git/ dotgit}"
  m="${m//Host:/Srv:}"
  m="${m//HTTP_CREDENTIAL_PROBE/probe}"
  m="${m//SCANNER_UA/scanner}"
  m="${m//SSH_BRUTE_FORCE/SSH}"
  m="${m//HTTP_404_FLOOD/404}"
  m="${m//Mozilla/UA}"
  m="${m// → / }"
  m="${m//—/-}"
  printf '%s' "$m"
}

send_whatsapp() {
  local msg="$1"
  msg=$(sanitize_wa_msg "$msg")
  local enc
  enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1][:1600]))" "$msg")
  local recipients="${IMPETUS_WHATSAPP_RECIPIENTS:-}"
  [[ -z "$recipients" ]] && return 0
  local IFS=,
  for pair in $recipients; do
    local phone="${pair%%:*}" apikey="${pair#*:}"
    [[ -z "$phone" || -z "$apikey" || "$apikey" == "PENDENTE" ]] && continue
    local phone_e
    phone_e=$(callmebot_phone_encoded "$phone")
    [[ -z "$phone_e" ]] && continue
    if callmebot_send "$phone_e" "$enc" "$apikey"; then
      log "WhatsApp OK → $phone"
    else
      log "WARN whatsapp failed → $phone"
    fi
    sleep 2
  done
}

send_webhook() {
  local payload="$1"
  local url="${IMPETUS_ALERT_WEBHOOK_URL:-}"
  [[ -z "$url" ]] && return 0
  curl -fsS -m 15 -X POST -H "Content-Type: application/json" -d "$payload" >/dev/null 2>&1 || log "WARN webhook failed"
}

is_already_banned() {
  local ip="$1"
  ufw status numbered 2>/dev/null | grep -Fq "$ip"
}

ufw_deny_ip() {
  local ip="$1" reason="$2"
  [[ "$AUTO_UFW_DENY" != "true" ]] && return 0
  is_trusted_ip "$ip" && return 0
  if is_already_banned "$ip"; then
    cf_ban_ip "$ip" "$reason"
    return 0
  fi
  ufw deny from "$ip" comment "IMPETUS auto-ban: $reason" >/dev/null 2>&1 || true
  log "UFW DENY $ip ($reason)"
  cf_ban_ip "$ip" "$reason"
}

cf_ban_ip() {
  local ip="$1" reason="$2"
  [[ "$AUTO_CF_BAN" != "true" ]] && return 0
  [[ -f "$CF_WAF_CONFIG" && -f "$CF_WAF_PY" ]] || return 0
  is_trusted_ip "$ip" && return 0
  cooldown_ok "cf_ban_${ip}" 3600 || return 0
  if IMPETUS_CF_CONFIG="$CF_WAF_CONFIG" python3 "$CF_WAF_PY" ban-ip "$ip" "$reason" >/dev/null 2>&1; then
    log "CF BLOCK $ip ($reason)"
  fi
}

# Ban silencioso: UFW + log local, sem incidente nem WhatsApp (probes bloqueados).
ban_silent() {
  local ip="$1" reason="$2" detail="$3"
  is_trusted_ip "$ip" && return 0
  cooldown_ok "silent_${ip}_${reason}" 3600 || return 0
  ufw_deny_ip "$ip" "$reason"
  log "BAN $reason $ip — $detail (silencioso)"
}

record_incident() {
  local severity="$1" category="$2" ip="$3" detail="$4"
  local ts id file
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  id=$(date -u +%Y%m%dT%H%M%SZ)-$$
  file="$INCIDENT_DIR/${id}.json"
  python3 - "$file" "$ts" "$severity" "$category" "$ip" "$detail" <<'PY'
import json, sys
path, ts, sev, cat, ip, detail = sys.argv[1:7]
doc = {
  "schema": "impetus_threat_incident_v1",
  "timestamp_utc": ts,
  "severity": sev,
  "category": cat,
  "source_ip": ip,
  "detail": detail,
  "actions": ["ufw_deny_if_enabled", "logged"],
  "cursor_prompt": (
    f"INCIDENTE IMPETUS {sev}: {cat} de {ip}. {detail}. "
    "Rever /var/log/impetus-threat-watch.log e nginx/access.log."
  ),
}
with open(path, "w") as f:
  json.dump(doc, f, indent=2, ensure_ascii=False)
print(path)
PY
  ln -sf "$file" "$INCIDENT_DIR/latest.json"
}

queue_incident() {
  local severity="$1" category="$2" ip="$3" detail="$4"
  local key="notify_${ip}_${category}"
  cooldown_ok "$key" || return 0
  ufw_deny_ip "$ip" "$category"
  record_incident "$severity" "$category" "$ip" "$detail"
  log "ALERT $severity $category $ip — $detail"
  if declare -F breach_note_critical_event >/dev/null 2>&1; then
    breach_note_critical_event "$category" "$ip"
  fi
  if should_notify_whatsapp "$severity"; then
    if [[ "$severity" == "CRITICAL" ]]; then
      if cooldown_ok "whatsapp_critical" 1800; then
        send_whatsapp "IMPETUS CRITICO
$category
IP $ip
$detail
srv $(hostname -s 2>/dev/null | tr -cd 'a-zA-Z0-9-' || echo impetus)"
      else
        printf '%s|%s|%s|%s\n' "$severity" "$category" "$ip" "$detail" >> "$QUEUE_FILE"
      fi
    else
      printf '%s|%s|%s|%s\n' "$severity" "$category" "$ip" "$detail" >> "$QUEUE_FILE"
    fi
    send_webhook "$(python3 -c "import json,sys; print(json.dumps({'severity':sys.argv[1],'category':sys.argv[2],'ip':sys.argv[3],'detail':sys.argv[4]}))" "$severity" "$category" "$ip" "$detail")"
  fi
}

flush_whatsapp_digest() {
  [[ ! -s "$QUEUE_FILE" ]] && return 0
  cooldown_ok "whatsapp_global" "$WA_COOLDOWN" || {
    log "WhatsApp digest adiado (cooldown ${WA_COOLDOWN}s)"
    return 0
  }
  local lines count
  count=$(wc -l < "$QUEUE_FILE" | tr -d ' ')
  lines=$(head -6 "$QUEUE_FILE" | while IFS='|' read -r sev cat ip _det; do
    echo "- $sev $cat IP $ip"
  done)
  local extra=""
  (( count > 6 )) && extra=" +$((count - 6))"
  local msg="IMPETUS ALERTA SERIO
$count evento(s)$extra
$lines
srv $(hostname -s 2>/dev/null | tr -cd 'a-zA-Z0-9-' || echo impetus)"
  send_whatsapp "$msg"
}

HTTP_PROBE_RE='(/\.env|/\.git|/wp-admin|/wp-login|/phpmyadmin|/\.aws/|/actuator/|/shell|/cmd|/\.vscode/|/vendor/phpunit|/xmlrpc\.php|/\.DS_Store|/admin\.php|/cgi-bin/)'
SCANNER_UA_RE='(nikto|sqlmap|masscan|zgrab|acunetix|nessus|OpenVAS|dirbuster|gobuster|ffuf|nmap|Nuclei|Silvy X Ran|bot.*scan|python-requests/[0-9]|Go-http-client)'

scan_nginx_new_lines() {
  local offset_file="$STATE_DIR/nginx.offset"
  local offset=0
  [[ -f "$offset_file" ]] && offset=$(cat "$offset_file" 2>/dev/null || echo 0)
  [[ ! -f "$NGINX_ACCESS" ]] && return 0
  local tmp
  tmp=$(mktemp)
  tail -c +"$((offset + 1))" "$NGINX_ACCESS" 2>/dev/null > "$tmp" || true
  local bytes
  bytes=$(wc -c < "$tmp" | tr -d ' ')
  [[ "$bytes" -eq 0 ]] && rm -f "$tmp" && return 0
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    local ip method path status ua
    ip=$(echo "$line" | awk '{print $1}')
    is_trusted_ip "$ip" && continue
    method=$(echo "$line" | awk -F'"' '{print $2}' | awk '{print $1}')
    path=$(echo "$line" | awk -F'"' '{print $2}' | awk '{print $2}')
    status=$(echo "$line" | awk '{print $9}')
    ua=$(echo "$line" | awk -F'"' '{print $6}')
    if declare -F breach_analyze_nginx >/dev/null 2>&1; then
      breach_analyze_nginx "$ip" "$method" "$path" "$status" "$ua"
      breach_is_locked && break
    fi
    if echo "$path" | grep -qiE "$HTTP_PROBE_RE"; then
      if [[ "$status" == "200" || "$status" == "206" ]]; then
        queue_incident "CRITICAL" "INVASION_SENSITIVE_200" "$ip" "GET $path status $status"
      else
        ban_silent "$ip" "HTTP_CREDENTIAL_PROBE" "GET $path status $status"
      fi
    elif echo "$ua" | grep -qiE "$SCANNER_UA_RE"; then
      if [[ "$status" == "200" || "$status" == "206" ]]; then
        queue_incident "HIGH" "SCANNER_UA" "$ip" "$method $path status $status"
      else
        ban_silent "$ip" "SCANNER_UA" "$method $path status $status"
      fi
    elif [[ "$NOTIFY_HTTP_WRITE" == "true" ]] && [[ "$method" == "POST" || "$method" == "PUT" || "$method" == "DELETE" ]] && [[ "$status" =~ ^(401|403|405|500)$ ]]; then
      queue_incident "MEDIUM" "HTTP_WRITE_ATTEMPT" "$ip" "$method $path status $status"
    fi
  done < "$tmp"
  echo "$((offset + bytes))" > "$offset_file"
  rm -f "$tmp"
}

scan_ssh_failures() {
  [[ ! -f "$AUTH_LOG" ]] && return 0
  local batch="" n=0
  while read -r count ip; do
    [[ -z "$ip" ]] && continue
    is_trusted_ip "$ip" && continue
    (( count >= SSH_THRESH )) || continue
    ufw_deny_ip "$ip" "SSH_BRUTE_FORCE"
    batch="${batch}${ip}(${count}x) "
    n=$((n + 1))
    (( n >= 5 )) && break
  done < <(grep -E 'Failed password|Invalid user' "$AUTH_LOG" 2>/dev/null | tail -300 | \
    sed -n 's/.* from \([^ ]*\) port.*/\1/p' | sort | uniq -c)
  [[ -z "$batch" ]] && return 0
  cooldown_ok "ssh_batch_digest" "$COOLDOWN" || return 0
  queue_incident "CRITICAL" "SSH_BRUTE_FORCE" "multi" "SSH brute: $batch"
}

scan_404_flood() {
  [[ ! -f "$NGINX_ACCESS" ]] && return 0
  while read -r ip cnt; do
    is_trusted_ip "$ip" && continue
    is_already_banned "$ip" && continue
    if [[ "$FLOOD_404_SILENT" == "true" ]]; then
      ban_silent "$ip" "HTTP_404_FLOOD" "$cnt x404 nginx"
    else
      queue_incident "MEDIUM" "HTTP_404_FLOOD" "$ip" "$cnt x404 nginx"
    fi
  done < <(tail -n 1200 "$NGINX_ACCESS" 2>/dev/null | awk -v t="$FLOOD_404_THRESH" '{c[$1]++} END {for (i in c) if (c[i]>=t) print i, c[i]}')
}

main() {
  breach_is_locked && exit 0
  scan_nginx_new_lines
  breach_is_locked && exit 0
  scan_ssh_failures
  scan_404_flood
  if declare -F breach_evaluate_global_combo >/dev/null 2>&1; then
    breach_evaluate_global_combo
  fi
  if declare -F breach_scan_admin_db >/dev/null 2>&1; then
    breach_scan_admin_db
  fi
  breach_is_locked && exit 0
  flush_whatsapp_digest
  rm -f "$QUEUE_FILE"
}

main "$@"
