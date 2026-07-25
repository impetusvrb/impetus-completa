#!/usr/bin/env bash
# IMPETUS — WAF Cloudflare (wrapper)
set -euo pipefail
REPO_ROOT="${REPO_ROOT:-/var/www/impetus-completa}"
PY="$REPO_ROOT/infra/scripts/cloudflare-waf-impetus.py"
CONFIG="${IMPETUS_CF_CONFIG:-/etc/impetus/cloudflare-waf.env}"
export IMPETUS_CF_CONFIG="$CONFIG"

cmd="${1:-status}"
case "$cmd" in
  apply)
    python3 "$PY" apply-scanner
    if [[ "${IMPETUS_CF_AUTO_BAN_IPS:-true}" == "true" ]]; then
      # shellcheck disable=SC1090
      [[ -f "$CONFIG" ]] && source "$CONFIG"
      python3 "$PY" sync-blocklist
    fi
    python3 "$PY" status
    ;;
  status) python3 "$PY" status ;;
  ban-ip) python3 "$PY" ban-ip "${2:?ip}" "${3:-manual}" ;;
  sync-ips) python3 "$PY" sync-blocklist ;;
  *)
    echo "Uso: $0 apply|status|ban-ip <ip>|sync-ips"
    exit 1
    ;;
esac
