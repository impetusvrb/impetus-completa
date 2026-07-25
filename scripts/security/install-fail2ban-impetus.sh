#!/usr/bin/env bash
# IMPETUS — Instalar fail2ban + bloquear IPs históricos de scanner
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

BLOCK_IPS=(
  "170.64.137.227"   # .git/config scan 03/Jul/2026
  "195.178.110.199"  # TLM-Audit-Scanner/1.0
)

echo "[1/5] Instalar configs fail2ban"
install -d /etc/fail2ban/jail.d
install -m 0644 "$ROOT/infra/fail2ban/filter.d/impetus-nginx-scan.conf" \
  /etc/fail2ban/filter.d/impetus-nginx-scan.conf
install -m 0644 "$ROOT/infra/fail2ban/jail.d/impetus.conf" \
  /etc/fail2ban/jail.d/impetus.conf

echo "[2/5] Bloquear IPs históricos (UFW)"
for ip in "${BLOCK_IPS[@]}"; do
  if ufw status | grep -q "$ip"; then
    echo "  já bloqueado: $ip"
  else
    ufw deny from "$ip" comment "IMPETUS scanner blocked $(date +%Y-%m-%d)"
    echo "  bloqueado: $ip"
  fi
done

echo "[3/5] UFW logging medium"
ufw logging medium

echo "[4/5] fail2ban restart"
systemctl enable fail2ban
systemctl restart fail2ban
fail2ban-client status

echo "[5/5] Verificação"
fail2ban-client status impetus-nginx-scan 2>/dev/null || true
fail2ban-client status sshd 2>/dev/null || true
echo "OK — fail2ban activo"
