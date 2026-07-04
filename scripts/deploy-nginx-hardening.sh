#!/usr/bin/env bash
# HARDENING-01 — Deploy config Nginx produção + snippets
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="${IMPETUS_NGINX_DOMAIN:-srv1422313.hstgr.cloud}"

echo "[1/6] Snippets proxy + hardening + log format"
install -m 0644 "$ROOT/infra/nginx/impetus-proxy.conf" /etc/nginx/snippets/impetus-proxy.conf
install -m 0644 "$ROOT/infra/nginx/impetus-proxy-ws.conf" /etc/nginx/snippets/impetus-proxy-ws.conf
install -m 0644 "$ROOT/infra/nginx/impetus-hardening-locations.conf" /etc/nginx/snippets/impetus-hardening-locations.conf
install -m 0644 "$ROOT/infra/nginx/impetus-log-format.conf" /etc/nginx/conf.d/impetus-log-format.conf

echo "[2/6] Site impetus (backup anterior se existir)"
if [ -f /etc/nginx/sites-available/impetus ]; then
  cp -a /etc/nginx/sites-available/impetus "/etc/nginx/sites-available/impetus.bak.$(date +%s)"
fi
install -m 0644 "$ROOT/infra/nginx/impetus-production.conf" /etc/nginx/sites-available/impetus

echo "[3/6] Symlink sites-enabled"
ln -sf /etc/nginx/sites-available/impetus /etc/nginx/sites-enabled/impetus
rm -f /etc/nginx/sites-enabled/default

echo "[4/6] nginx -t"
nginx -t

echo "[5/6] reload nginx"
systemctl reload nginx

echo "[6/6] verify .env blocked (expect 403)"
curl -sI "https://${DOMAIN}/.env" | head -3 || true

echo "OK — Nginx HARDENING-02 activo para $DOMAIN"
