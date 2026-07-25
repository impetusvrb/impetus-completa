#!/usr/bin/env bash
# Sincroniza jails/filters fail2ban do repositório IMPETUS para /etc/fail2ban
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/impetus-completa}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Execute como root: sudo bash $0"
  exit 1
fi

install -d /etc/fail2ban/filter.d /etc/fail2ban/jail.d

for f in "$REPO_ROOT"/infra/fail2ban/filter.d/*.conf; do
  cp -f "$f" /etc/fail2ban/filter.d/
done
cp -f "$REPO_ROOT/infra/fail2ban/jail.d/impetus.conf" /etc/fail2ban/jail.d/impetus.conf

fail2ban-client reload 2>/dev/null || systemctl restart fail2ban
echo "[OK] fail2ban IMPETUS sincronizado"
fail2ban-client status 2>/dev/null || true
