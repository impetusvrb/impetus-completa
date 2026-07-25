#!/usr/bin/env bash
# Permite HTTP/HTTPS apenas dos IPs Cloudflare (mantém SSH/regras existentes).
set -euo pipefail

CF_V4_URL="https://www.cloudflare.com/ips-v4"
CF_V6_URL="https://www.cloudflare.com/ips-v6"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Execute como root: sudo bash $0"
  exit 1
fi

echo "[1/2] UFW allow 80/443 — Cloudflare IPv4"
while read -r cidr; do
  [[ -z "$cidr" ]] && continue
  ufw allow from "$cidr" to any port 80 proto tcp comment 'CF HTTP' >/dev/null 2>&1 || true
  ufw allow from "$cidr" to any port 443 proto tcp comment 'CF HTTPS' >/dev/null 2>&1 || true
done < <(curl -fsSL "$CF_V4_URL")

echo "[2/2] UFW allow 80/443 — Cloudflare IPv6"
while read -r cidr; do
  [[ -z "$cidr" ]] && continue
  ufw allow from "$cidr" to any port 80 proto tcp comment 'CF HTTP v6' >/dev/null 2>&1 || true
  ufw allow from "$cidr" to any port 443 proto tcp comment 'CF HTTPS v6' >/dev/null 2>&1 || true
done < <(curl -fsSL "$CF_V6_URL")

ufw status | grep -c 'CF HTTP' || true
echo "[OK] Regras Cloudflare HTTP/HTTPS adicionadas"
