#!/usr/bin/env bash
# IMPETUS — Ban permanente UFW para IPs atacantes conhecidos.
# Fontes: blocklist, nginx (probes), incidentes, abuse-report CSV.
# Uso: sudo bash infra/scripts/impetus-permanent-ip-ban.sh [--dry-run]
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/impetus-completa}"
BLOCKLIST="${IMPETUS_BLOCKLIST:-$REPO_ROOT/infra/security/permanent-blocklist.txt}"
NGINX_ACCESS="${IMPETUS_NGINX_ACCESS:-/var/log/nginx/access.log}"
INCIDENT_DIR="${IMPETUS_INCIDENT_DIR:-/var/lib/impetus/incidents}"
ABUSE_CSV="$REPO_ROOT/backend/docs/security/abuse-reports/abuse-report-20260704T224745Z.csv"
DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

HTTP_PROBE_RE='(/\.env|/\.git|/wp-admin|/wp-login|/phpmyadmin|/\.aws/|/actuator/|/shell|/cmd|/\.vscode/|/vendor/phpunit|/xmlrpc\.php|/\.DS_Store|/admin\.php|/cgi-bin/)'

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

is_trusted_ip() {
  local ip="$1"
  [[ "$ip" == "127.0.0.1" || "$ip" == "::1" ]] && return 0
  [[ "$ip" == 170.246.* ]] && return 0
  [[ "$ip" == 186.225.* ]] && return 0
  [[ "$ip" == 2804:2484:* ]] && return 0
  [[ "$ip" == 2804:2980:* ]] && return 0
  return 1
}

is_cloudflare_ip() {
  local ip="$1"
  python3 - "$ip" <<'PY'
import ipaddress, sys
ip_s = sys.argv[1]
try:
    ip = ipaddress.ip_address(ip_s)
except ValueError:
    sys.exit(1)
cf4 = [
    "173.245.48.0/20","103.21.244.0/22","103.22.200.0/22","103.31.4.0/22",
    "141.101.64.0/18","108.162.192.0/18","190.93.240.0/20","188.114.96.0/20",
    "197.234.240.0/22","198.41.128.0/17","162.158.0.0/15","104.16.0.0/13",
    "104.24.0.0/14","172.64.0.0/13","172.68.0.0/16","172.71.0.0/16",
    "104.23.0.0/16",
]
cf6 = ["2400:cb00::/32","2606:4700::/32","2803:f800::/32","2405:b500::/32",
       "2405:8100::/32","2a06:98c0::/29","2c0f:f248::/32"]
nets = [ipaddress.ip_network(n) for n in cf4 + cf6]
for n in nets:
    if ip in n:
        sys.exit(0)
sys.exit(1)
PY
}

ufw_has_ip() {
  local ip="$1"
  ufw status numbered 2>/dev/null | grep -Fq "$ip"
}

ufw_deny_ip() {
  local ip="$1" reason="$2"
  is_trusted_ip "$ip" && return 0
  is_cloudflare_ip "$ip" && { log "SKIP CF $ip"; return 0; }
  if ufw_has_ip "$ip"; then
    return 0
  fi
  if $DRY_RUN; then
    log "DRY-RUN UFW DENY $ip ($reason)"
    return 0
  fi
  ufw deny from "$ip" comment "IMPETUS permanent-ban: $reason" >/dev/null 2>&1 || true
  log "UFW DENY $ip ($reason)"
}

collect_ips() {
  local tmp
  tmp=$(mktemp)
  # blocklist
  [[ -f "$BLOCKLIST" ]] && grep -vE '^\s*#|^\s*$' "$BLOCKLIST" | awk '{print $1}' >> "$tmp"
  # nginx probes (últimos 50k)
  if [[ -f "$NGINX_ACCESS" ]]; then
    tail -n 50000 "$NGINX_ACCESS" 2>/dev/null | grep -iE "$HTTP_PROBE_RE" | awk '{print $1}' >> "$tmp" || true
  fi
  # incidentes JSON
  if [[ -d "$INCIDENT_DIR" ]]; then
    grep -rh '"source_ip"' "$INCIDENT_DIR"/*.json 2>/dev/null | \
      sed -n 's/.*"source_ip"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' >> "$tmp" || true
  fi
  # abuse report
  if [[ -f "$ABUSE_CSV" ]]; then
    tail -n +2 "$ABUSE_CSV" | cut -d, -f1 >> "$tmp" || true
  fi
  # auth.log SSH failures
  if [[ -f /var/log/auth.log ]]; then
    grep -E 'Failed password|Invalid user' /var/log/auth.log 2>/dev/null | \
      sed -n 's/.* from \([^ ]*\) port.*/\1/p' | sort -u >> "$tmp" || true
  fi
  sort -u "$tmp" | grep -vE '^multi$|^$'
  rm -f "$tmp"
}

main() {
  [[ "$(id -u)" -eq 0 ]] || { echo "Requer root: sudo bash $0"; exit 1; }
  local count=0 banned=0
  while IFS= read -r ip; do
    [[ -z "$ip" ]] && continue
    is_trusted_ip "$ip" && continue
    is_cloudflare_ip "$ip" && continue
    count=$((count + 1))
    if ! ufw_has_ip "$ip"; then
      ufw_deny_ip "$ip" "permanent-blocklist"
      banned=$((banned + 1))
    fi
  done < <(collect_ips)
  log "Concluído: $count IPs analisados, $banned novos bans UFW"
  if ! $DRY_RUN && (( banned > 0 )); then
    ufw reload >/dev/null 2>&1 || true
  fi
}

main "$@"
