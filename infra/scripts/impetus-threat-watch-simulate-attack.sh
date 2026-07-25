#!/bin/bash
# Simulação controlada de ataque HTTP — dispara threat-watch + WhatsApp.
# IP 203.0.113.0/24 = TEST-NET (RFC 5737), nunca IP real de cliente.
set -euo pipefail

SIM_IP="${IMPETUS_SIM_IP:-203.0.113.77}"
NGINX_ACCESS="${IMPETUS_NGINX_ACCESS:-/var/log/nginx/access.log}"
STATE_DIR="/var/lib/impetus/threat-watch"
LOG="/var/log/impetus-threat-watch.log"
TS=$(date -u '+%d/%b/%Y:%H:%M:%S +0000')

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] SIM $*" | tee -a "$LOG"; }

log "Início simulação ataque autorizada (Gustavo) — IP $SIM_IP"

# Linhas no formato nginx combined — padrão Silvy/credential probe
append_log() {
  local method="$1" path="$2" status="$3" ua="$4"
  printf '%s - - [%s] "%s %s HTTP/1.1" %s 0 "-" "%s"\n' \
    "$SIM_IP" "$TS" "$method" "$path" "$status" "$ua" >> "$NGINX_ACCESS"
}

append_log GET '/.env' 404 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 (Silvy X Ran)'
append_log GET '/.git/config' 404 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 (Silvy X Ran)'
append_log GET '/wp-admin/' 404 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 (Silvy X Ran)'

# Limpar cooldown deste IP para garantir alerta mesmo se teste recente
rm -f "$STATE_DIR"/cooldown_notify_"${SIM_IP//./_}"_* 2>/dev/null || true

# Limpar cooldown WhatsApp para forçar envio imediato nesta simulação
rm -f /var/lib/impetus/threat-watch/cooldown_whatsapp_global 2>/dev/null || true
rm -f /var/lib/impetus/threat-watch/cooldown_notify_203_0_113_77_* 2>/dev/null || true

log "Logs injectados — executando threat-watch (1 WhatsApp agrupado)..."
/usr/local/bin/impetus-threat-watch.sh

log "Simulação concluída. Verifique WhatsApp (Gustavo + Welligton) e $LOG"
