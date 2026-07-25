#!/usr/bin/env bash
# Relatório fail2ban + UFW bans — últimos 30 dias (aprox. via logs disponíveis)
set -euo pipefail

OUT="${1:-/var/www/impetus-completa/backend/docs/evidence/admin-portal-security/FAIL2BAN_RELATORIO_30D.md}"
mkdir -p "$(dirname "$OUT")"

{
  echo "# Relatório fail2ban / UFW — IMPETUS"
  echo ""
  echo "Gerado: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "## Jails activas"
  echo '```'
  fail2ban-client status 2>/dev/null || echo "fail2ban indisponível"
  for j in impetus-auth-fail impetus-nginx-scan nginx-limit-req sshd; do
    echo "--- $j ---"
    fail2ban-client status "$j" 2>/dev/null | tail -5 || true
  done
  echo '```'
  echo ""
  echo "## IPs banidos (UFW DENY IMPETUS)"
  echo '```'
  ufw status numbered 2>/dev/null | grep -E 'DENY IN.*IMPETUS|auto-ban' | head -80 || true
  echo '```'
  echo ""
  echo "## Eventos threat-watch (últimas 48h amostra)"
  echo '```'
  tail -40 /var/log/impetus-threat-watch.log 2>/dev/null | grep -E 'ALERT|UFW DENY' || echo "(sem log)"
  echo '```'
} > "$OUT"

echo "[OK] $OUT"
