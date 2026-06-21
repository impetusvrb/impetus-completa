#!/usr/bin/env bash
# Atualiza listas de IPs Cloudflare para Nginx (real_ip) e UFW.
# Executar como root: sudo bash infra/scripts/update-cloudflare-ips.sh

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/impetus-completa}"
NGINX_CF_CONF="/etc/nginx/conf.d/cloudflare-real-ip.conf"
UFW_CF_DIR="/etc/ufw/applications.d"
CF_V4_URL="https://www.cloudflare.com/ips-v4"
CF_V6_URL="https://www.cloudflare.com/ips-v6"

TMP_V4=$(mktemp)
TMP_V6=$(mktemp)
trap 'rm -f "$TMP_V4" "$TMP_V6"' EXIT

curl -fsSL "$CF_V4_URL" -o "$TMP_V4"
curl -fsSL "$CF_V6_URL" -o "$TMP_V6"

{
  echo "# Gerado em $(date -u +%Y-%m-%dT%H:%M:%SZ) — não editar manualmente"
  echo "# Fonte: $CF_V4_URL e $CF_V6_URL"
  echo ""
  while read -r cidr; do
    [[ -n "$cidr" ]] && echo "set_real_ip_from $cidr;"
  done < "$TMP_V4"
  while read -r cidr; do
    [[ -n "$cidr" ]] && echo "set_real_ip_from $cidr;"
  done < "$TMP_V6"
  echo ""
  echo "real_ip_header CF-Connecting-IP;"
  echo "real_ip_recursive on;"
} | sudo tee "$NGINX_CF_CONF" > /dev/null

# Cópia de referência no repositório (opcional)
cp "$NGINX_CF_CONF" "$REPO_ROOT/infra/nginx/cloudflare-real-ip.conf.generated" 2>/dev/null || true

echo "[OK] Nginx Cloudflare real_ip → $NGINX_CF_CONF"
echo "     Teste: sudo nginx -t && sudo systemctl reload nginx"
