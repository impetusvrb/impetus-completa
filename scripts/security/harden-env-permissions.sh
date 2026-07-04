#!/usr/bin/env bash
# Bloco 1 — Permissões restritas em .env (600, dono da app)
# Uso: ./harden-env-permissions.sh [--apply]
set -euo pipefail

APPLY=false
[[ "${1:-}" == "--apply" ]] && APPLY=true

APP_USER="${IMPETUS_APP_USER:-root}"
ENV_PATHS=(
  /var/www/impetus-completa/backend/.env
  /var/www/impetus-completa/frontend/.env.production
)

echo "=== Harden .env permissions (dry-run=${APPLY}) ==="

for f in "${ENV_PATHS[@]}"; do
  [[ -f "$f" ]] || continue
  perms=$(stat -c '%a' "$f")
  owner=$(stat -c '%U:%G' "$f")
  echo "  $f → $perms $owner"
  if [[ "$perms" != "600" ]]; then
    if $APPLY; then
      chown "$APP_USER:$APP_USER" "$f" 2>/dev/null || true
      chmod 600 "$f"
      echo "    FIXED → 600"
    else
      echo "    WOULD FIX → chmod 600 (run with --apply)"
    fi
  fi
done

echo
echo "--- Backups .env encontrados (revisar remoção/arquivo seguro) ---"
find /var/www/impetus-completa -maxdepth 3 \( -name ".env.bak*" -o -name ".env.backup*" -o -name ".env.bkp*" -o -name ".env.pre-*" \) 2>/dev/null | head -30

if ! $APPLY; then
  echo
  echo "Dry-run. Para aplicar: IMPETUS_APP_USER=www-data $0 --apply"
fi
