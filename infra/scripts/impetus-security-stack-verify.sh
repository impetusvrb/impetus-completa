#!/usr/bin/env bash
# IMPETUS — Verificação final da pilha de segurança (rede + servidor + software)
# Uso: bash infra/scripts/impetus-security-stack-verify.sh
# Saída: backend/docs/evidence/admin-portal-security/STACK_SEGURANCA_STATUS.md
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/impetus-completa}"
OUT="${REPO_ROOT}/backend/docs/evidence/admin-portal-security/STACK_SEGURANCA_STATUS.md"
ENV_FILE="${REPO_ROOT}/backend/.env"

pass() { echo "✅ $1"; }
warn() { echo "⚠️ $1"; }
fail() { echo "❌ $1"; }

{
  echo "# Pilha de Segurança IMPETUS — Status"
  echo ""
  echo "Gerado: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "## Verificações"
  echo ""

  # PM2
  echo "### Processos"
  if pm2 jlist 2>/dev/null | grep -q '"name":"impetus-backend"'; then
    pass "PM2 impetus-backend online"
  else
    fail "PM2 impetus-backend offline"
  fi
  if pm2 jlist 2>/dev/null | grep -q '"name":"impetus-admin-portal"'; then
    pass "PM2 impetus-admin-portal online"
  else
    fail "PM2 impetus-admin-portal offline"
  fi
  echo ""

  # HTTPS + Cloudflare
  echo "### Cloudflare / HTTPS"
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" -m 15 https://plataformaimpetus.com/ 2>/dev/null || echo "000")
  CF=$(curl -sSI -m 15 https://plataformaimpetus.com/ 2>/dev/null | grep -i '^server:' | head -1 || true)
  if [[ "$CODE" == "200" ]]; then pass "https://plataformaimpetus.com → HTTP $CODE"; else fail "plataformaimpetus.com → HTTP $CODE"; fi
  if echo "$CF" | grep -qi cloudflare; then pass "Resposta via Cloudflare ($CF)"; else warn "Sem header cloudflare visível"; fi
  WWW=$(curl -sS -o /dev/null -w "%{http_code}" -m 15 https://www.plataformaimpetus.com/painel/ 2>/dev/null || echo "000")
  if [[ "$WWW" == "200" ]]; then pass "www + painel → HTTP $WWW"; else warn "www painel → HTTP $WWW"; fi
  echo ""

  # SSL cert
  echo "### Certificado origem"
  if [[ -f /etc/letsencrypt/live/plataformaimpetus.com/cert.pem ]]; then
    EXP=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/plataformaimpetus.com/cert.pem 2>/dev/null | cut -d= -f2)
    pass "Let's Encrypt plataformaimpetus.com (expira: $EXP)"
    openssl x509 -in /etc/letsencrypt/live/plataformaimpetus.com/cert.pem -noout -text 2>/dev/null | grep -E "DNS:" | head -1 | sed 's/^/  /' || true
  else
    fail "Certificado plataformaimpetus.com ausente"
  fi
  echo ""

  # CF guard
  echo "### Guard nginx (bypass IP)"
  if grep -q IMPETUS_CF_PROXY_GUARD /etc/nginx/sites-enabled/impetus 2>/dev/null; then
    pass "Cloudflare proxy guard activo"
  else
    warn "Guard Cloudflare não encontrado no nginx"
  fi
  echo ""

  # fail2ban
  echo "### fail2ban"
  if command -v fail2ban-client >/dev/null 2>&1; then
    pass "fail2ban instalado"
    fail2ban-client status 2>/dev/null | sed 's/^/  /' || true
  else
    fail "fail2ban não instalado"
  fi
  echo ""

  # threat-watch
  echo "### threat-watch"
  if [[ -f /etc/impetus/threat-watch.env ]]; then
    pass "threat-watch.env presente"
  else
    warn "threat-watch.env ausente"
  fi
  if [[ -f /var/log/impetus-threat-watch.log ]]; then
    pass "Log threat-watch ($(wc -l < /var/log/impetus-threat-watch.log) linhas)"
  fi
  echo ""

  # Software flags
  echo "### Software (.env)"
  if [[ -f "$ENV_FILE" ]]; then
    grep -E '^IMPETUS_MFA_ENABLED=|^IMPETUS_ADMIN_PORTAL_MFA_ENABLED=|^ADMIN_PORTAL_TURNSTILE_SITE_KEY=|^SECURITY_OBSERVATORY=|^SECURITY_PROTECTION_MODE=' "$ENV_FILE" 2>/dev/null | sed 's/SECRET_KEY=.*/SECRET_KEY=***/' | sed 's/^/  /' || true
    if grep -q '^ADMIN_PORTAL_TURNSTILE_SITE_KEY=0x' "$ENV_FILE" 2>/dev/null; then pass "Turnstile configurado"; else warn "Turnstile sem site key"; fi
    if grep -q '^IMPETUS_MFA_ENABLED=true' "$ENV_FILE" 2>/dev/null; then pass "MFA app cliente ligado"; fi
    if grep -q '^IMPETUS_ADMIN_PORTAL_MFA_ENABLED=true' "$ENV_FILE" 2>/dev/null; then pass "MFA painel ligado"; fi
    if grep -q '^SECURITY_OBSERVATORY=true' "$ENV_FILE" 2>/dev/null; then pass "IA segurança (observatório) ligada"; fi
  fi
  echo ""

  # API endpoints
  echo "### APIs"
  BOT=$(curl -sS -m 10 http://127.0.0.1:4000/api/impetus-admin/auth/bot-config 2>/dev/null | grep -o '"mode":"[^"]*"' | head -1 || true)
  if echo "$BOT" | grep -q turnstile; then pass "Turnstile API: $BOT"; else warn "bot-config: $BOT"; fi
  HEALTH=$(curl -sS -m 8 http://127.0.0.1:4000/api/health 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 || true)
  if echo "$HEALTH" | grep -q ok; then pass "Backend health: $HEALTH"; else warn "health: $HEALTH"; fi
  echo ""

  echo "## Pendente (equipa)"
  echo ""
  echo "- [ ] 2FA activo nas 5 contas (fazer quando possível)"
  echo "- [x] DNS Cloudflare"
  echo "- [x] Turnstile painel"
  echo "- [x] Bot Fight Mode (confirmado pela equipa)"
  echo "- [x] Full (strict) — activar no Cloudflare se ainda não guardou"
  echo ""
  echo "## URLs"
  echo ""
  echo "| Serviço | URL |"
  echo "|---------|-----|"
  echo "| App | https://plataformaimpetus.com |"
  echo "| Painel | https://plataformaimpetus.com/painel/ |"
  echo "| Centro Segurança | https://plataformaimpetus.com/painel/seguranca |"
  echo "| 2FA conta painel | https://plataformaimpetus.com/painel/conta-seguranca |"
  echo "| 2FA app | https://plataformaimpetus.com/app/settings → Segurança |"
} | tee "$OUT"

echo ""
echo "[OK] Relatório: $OUT"
