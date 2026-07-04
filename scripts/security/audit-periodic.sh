#!/usr/bin/env bash
# Bloco 8 — Auditoria periódica pós-incidente (Silvy / scanning)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DOMAIN="${IMPETUS_DOMAIN:-srv1422313.hstgr.cloud}"
REPORT="${1:-/tmp/impetus-security-audit-$(date +%Y%m%d-%H%M%S).txt}"

{
  echo "=== IMPETUS Security Audit ==="
  echo "Date: $(date -Iseconds)"
  echo "Host: $(hostname)"
  echo

  echo "--- Bloco 1: .env files (maxdepth 4) ---"
  find /var/www -maxdepth 4 -name ".env*" -not -path "*/node_modules/*" 2>/dev/null | while read -r f; do
    ls -la "$f"
  done

  echo
  echo "--- Bloco 2: nginx root/alias ---"
  grep -rn "root\|alias" /etc/nginx/sites-enabled/ 2>/dev/null || true

  echo
  echo "--- Bloco 2: .env probes in nginx logs ---"
  if [ -d /var/log/nginx ]; then
    zgrep -h "GET /\.env " /var/log/nginx/access.log* 2>/dev/null | awk '{print $1}' | sort | uniq -c | sort -rn | head -20 || echo "(no matches)"
  fi

  echo
  echo "--- Bloco 4: UFW ---"
  ufw status verbose 2>/dev/null || echo "ufw not available"

  echo
  echo "--- Bloco 4: SSH hardening ---"
  grep -rhE "^(PermitRootLogin|PasswordAuthentication)" /etc/ssh/sshd_config /etc/ssh/sshd_config.d/ 2>/dev/null || true

  echo
  echo "--- Bloco 5: backend deps audit ---"
  if [ -f "$ROOT/backend/package.json" ]; then
    (cd "$ROOT/backend" && npm audit --audit-level=critical 2>/dev/null) || echo "npm audit skipped"
  fi

  echo
  echo "--- Bloco 8: external .env probe (403 expected) ---"
  curl -sI "https://${DOMAIN}/.env" | head -5 || echo "curl failed"

} | tee "$REPORT"

echo "Report: $REPORT"
