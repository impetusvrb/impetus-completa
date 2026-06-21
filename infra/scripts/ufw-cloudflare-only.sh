#!/usr/bin/env bash
# Firewall: portas 80/443 apenas a partir dos IPs Cloudflare; 3000/4000 bloqueadas ao público.
#
# IMPORTANTE:
#   - Defina ADMIN_SSH_IP com o IP fixo de administração ANTES de executar.
#   - Mantenha uma sessão SSH aberta enquanto testa; erro nas regras pode bloquear acesso.
#   - Cloudflare NÃO faz proxy de SSH — nunca restrinja porta 22 só a IPs CF.
#
# Uso:
#   export ADMIN_SSH_IP="203.0.113.50"   # seu IP de casa/escritório
#   sudo -E bash infra/scripts/ufw-cloudflare-only.sh

set -euo pipefail

ADMIN_SSH_IP="${ADMIN_SSH_IP:-}"
CF_V4_URL="https://www.cloudflare.com/ips-v4"
CF_V6_URL="https://www.cloudflare.com/ips-v6"

if [[ -z "$ADMIN_SSH_IP" ]]; then
  echo "ERRO: defina ADMIN_SSH_IP (ex.: export ADMIN_SSH_IP=\"203.0.113.50\")"
  exit 1
fi

if ! command -v ufw >/dev/null 2>&1; then
  echo "Instale UFW: sudo apt install -y ufw"
  exit 1
fi

echo "[1/6] Reset política UFW (default deny incoming)"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

echo "[2/6] SSH apenas do IP de administração"
ufw allow from "$ADMIN_SSH_IP" to any port 22 proto tcp comment 'SSH admin'

echo "[3/6] HTTP/HTTPS apenas Cloudflare IPv4"
while read -r cidr; do
  [[ -z "$cidr" ]] && continue
  ufw allow from "$cidr" to any port 80 proto tcp comment 'CF HTTP'
  ufw allow from "$cidr" to any port 443 proto tcp comment 'CF HTTPS'
done < <(curl -fsSL "$CF_V4_URL")

echo "[4/6] HTTP/HTTPS apenas Cloudflare IPv6 (se aplicável)"
while read -r cidr; do
  [[ -z "$cidr" ]] && continue
  ufw allow from "$cidr" to any port 80 proto tcp comment 'CF HTTP v6'
  ufw allow from "$cidr" to any port 443 proto tcp comment 'CF HTTPS v6'
done < <(curl -fsSL "$CF_V6_URL")

echo "[5/6] Bloquear acesso público directo às portas da aplicação"
ufw deny 3000/tcp comment 'Block public frontend'
ufw deny 4000/tcp comment 'Block public backend API'

# Localhost continua a funcionar (UFW não afecta tráfego local por defeito em muitas distros,
# mas o bind 127.0.0.1 nas apps é a camada principal de defesa).

echo "[6/6] Activar UFW"
ufw --force enable
ufw status numbered

echo ""
echo "Concluído. Verifique:"
echo "  - curl -I https://SEU_DOMINIO  (via Cloudflare)"
echo "  - curl -I http://72.61.221.152:3000  (deve falhar/timeout de fora)"
echo "  - curl -I http://72.61.221.152:4000/health  (deve falhar/timeout de fora)"
