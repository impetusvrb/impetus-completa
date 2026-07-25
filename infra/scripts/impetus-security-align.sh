#!/usr/bin/env bash
# IMPETUS — Alinha pilha de segurança em 3 camadas:
#   1. Cloudflare (nginx real_ip + guard opcional)
#   2. fail2ban + threat-watch (servidor)
#   3. MFA/Turnstile (software — flags em backend/.env)
#
# Uso: sudo bash infra/scripts/impetus-security-align.sh [--apply]
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/impetus-completa}"
APPLY=false
[[ "${1:-}" == "--apply" ]] && APPLY=true

echo "═══════════════════════════════════════════════════════════"
echo " IMPETUS — Security Stack Alignment"
echo "═══════════════════════════════════════════════════════════"

section() { echo ""; echo "── $1 ──"; }

section "1/4 Cloudflare (rede — fora do app)"
if [[ -f /etc/nginx/cloudflare-real-ip.conf ]] || [[ -f /etc/nginx/conf.d/cloudflare-real-ip.conf ]]; then
  echo "  real_ip Cloudflare: OK (ficheiro presente)"
else
  echo "  real_ip Cloudflare: AUSENTE — correr update-cloudflare-ips.sh"
fi
if [[ -x "$REPO_ROOT/infra/scripts/enable-cloudflare-proxy-mode.sh" ]]; then
  bash "$REPO_ROOT/infra/scripts/enable-cloudflare-proxy-mode.sh" status 2>/dev/null || echo "  proxy_guard: unknown"
fi
echo "  Próximo passo manual: DNS na Cloudflare (proxy laranja) + Turnstile keys em .env"

section "2/4 fail2ban (servidor)"
if command -v fail2ban-client >/dev/null 2>&1; then
  fail2ban-client status 2>/dev/null | sed 's/^/  /' || echo "  fail2ban não responde"
  if $APPLY && [[ "$(id -u)" -eq 0 ]]; then
    bash "$REPO_ROOT/infra/scripts/deploy-fail2ban-impetus.sh"
  elif $APPLY; then
    echo "  [SKIP] deploy fail2ban requer root"
  fi
else
  echo "  fail2ban não instalado"
fi

section "3/4 threat-watch (servidor)"
if [[ -f /etc/impetus/threat-watch.env ]]; then
  echo "  /etc/impetus/threat-watch.env: OK"
  grep -E '^IMPETUS_WHATSAPP_MIN_SEVERITY=|^IMPETUS_404_FLOOD_SILENT=' /etc/impetus/threat-watch.env 2>/dev/null | sed 's/^/  /' || true
  systemctl is-active impetus-threat-watch.timer 2>/dev/null | sed 's/^/  timer: /' || echo "  timer: (cron manual)"
else
  echo "  threat-watch.env: não encontrado"
fi

section "3c/4 IP allowlist (só visitantes autorizados)"
if [[ -x "$REPO_ROOT/infra/scripts/impetus-authorized-ip.sh" ]]; then
  bash "$REPO_ROOT/infra/scripts/impetus-authorized-ip.sh" status 2>/dev/null | sed 's/^/  /' || true
  echo "  Gerir cliente: sudo bash $REPO_ROOT/infra/scripts/impetus-authorized-ip.sh add <IP> \"Cliente Nome\""
else
  echo "  script impetus-authorized-ip.sh ausente"
fi

section "3d/4 Cloudflare WAF (borda — .env/.git)"
if [[ -f /etc/impetus/cloudflare-waf.env ]]; then
  IMPETUS_CF_CONFIG=/etc/impetus/cloudflare-waf.env python3 "$REPO_ROOT/infra/scripts/cloudflare-waf-impetus.py" status 2>/dev/null | sed 's/^/  /' || echo "  (token inválido ou sem permissão)"
else
  echo "  /etc/impetus/cloudflare-waf.env ausente — ver infra/security/cloudflare-waf.env.example"
fi

section "3b/4 UFW allowlist (só autorizados)"
if command -v ufw >/dev/null 2>&1; then
  ufw status verbose 2>/dev/null | grep -E '^Default:' | sed 's/^/  /' || true
  echo "  SSH: equipa (170.246/186.225/2804) apenas"
  echo "  HTTP/HTTPS: Cloudflare + equipa (default deny para resto)"
  ufw status numbered 2>/dev/null | grep -c 'DENY IN' | sed 's/^/  regras DENY activas: /' || ufw status 2>/dev/null | grep -c DENY | sed 's/^/  regras DENY activas: /' || true
fi

section "4/4 MFA / 2FA (dentro do software)"
ENV_FILE="$REPO_ROOT/backend/.env"
if [[ -f "$ENV_FILE" ]]; then
  grep -E '^IMPETUS_MFA_ENABLED=|^IMPETUS_MFA_MODE=|^IMPETUS_ADMIN_PORTAL_MFA' "$ENV_FILE" 2>/dev/null | sed 's/^/  /' || true
  node -e "
    require('dotenv').config({ path: '$ENV_FILE' });
    const f = require('$REPO_ROOT/backend/src/mfa/config/mfaFlags');
    console.log('  MFA enabled:', f.isMfaEnabled(), '| mode:', f.mfaMode());
  " 2>/dev/null || echo "  (não foi possível ler flags MFA)"
else
  echo "  backend/.env ausente"
fi

echo ""
echo "Referência: $REPO_ROOT/infra/security/security-stack.env.example"
if ! $APPLY; then
  echo "Para aplicar fail2ban: sudo bash $0 --apply"
fi
echo "═══════════════════════════════════════════════════════════"
