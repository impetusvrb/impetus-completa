#!/usr/bin/env bash
# Activa/desactiva guard nginx que exige proxy Cloudflare (CF-RAY).
# Uso: sudo bash infra/scripts/enable-cloudflare-proxy-mode.sh on|off|status
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/impetus-completa}"
SNIPPET_SRC="$REPO_ROOT/infra/nginx/snippets/impetus-cloudflare-proxy-guard.conf"
SNIPPET_DST="/etc/nginx/snippets/impetus-cloudflare-proxy-guard.conf"
SITE="/etc/nginx/sites-enabled/impetus"
MARKER="# IMPETUS_CF_PROXY_GUARD"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Execute como root"
  exit 1
fi

cmd="${1:-status}"

install_snippet() {
  install -d /etc/nginx/snippets
  cp -f "$SNIPPET_SRC" "$SNIPPET_DST"
}

enable_site() {
  install_snippet
  if grep -q "$MARKER" "$SITE" 2>/dev/null; then
    echo "[INFO] Guard já presente em $SITE"
    return
  fi
  # Inserir após server_tokens off; dentro do bloco server 443
  if ! grep -q 'server_tokens off' "$SITE"; then
    echo "ERRO: não encontrou server_tokens off em $SITE"
    exit 1
  fi
  sed -i "/server_tokens off;/a\\    $MARKER\\n    include $SNIPPET_DST;" "$SITE"
  echo "[OK] Guard Cloudflare activado em nginx"
}

disable_site() {
  if [[ -f "$SITE" ]]; then
    sed -i "/$MARKER/d" "$SITE"
    sed -i "\|include $SNIPPET_DST|d" "$SITE"
  fi
  echo "[OK] Guard Cloudflare desactivado"
}

case "$cmd" in
  on|enable)
    enable_site
    nginx -t
    systemctl reload nginx
    echo "IMPORTANTE: só funcione com DNS em proxy Cloudflare (nuvem laranja)."
    ;;
  off|disable)
    disable_site
    nginx -t
    systemctl reload nginx
    ;;
  status)
    if grep -q "$MARKER" "$SITE" 2>/dev/null; then
      echo "cloudflare_proxy_guard=ENABLED"
    else
      echo "cloudflare_proxy_guard=DISABLED"
    fi
  ;;
  *)
    echo "Uso: $0 on|off|status"
    exit 1
    ;;
esac
