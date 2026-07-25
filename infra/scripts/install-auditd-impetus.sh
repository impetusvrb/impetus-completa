#!/bin/bash
# IMPETUS OPS — Instala auditd + regras forensics (impetus_delete, impetus_env, exec rm/rsync/git)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RULES_SRC="$ROOT/infra/security/audit/impetus-audit.rules"
RULES_DST="/etc/audit/rules.d/impetus.rules"
LOG="/var/log/impetus-audit-install.log"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Execute como root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
if ! command -v auditctl >/dev/null 2>&1; then
  log "A instalar auditd…"
  apt-get update -qq
  apt-get install -y -qq auditd audispd-plugins
fi

install -d /etc/audit/rules.d
install -m 0640 "$RULES_SRC" "$RULES_DST"
log "Regras copiadas → $RULES_DST"

if command -v augenrules >/dev/null 2>&1; then
  augenrules --load
else
  auditctl -R "$RULES_DST" || true
fi

systemctl enable auditd
systemctl restart auditd
sleep 2

if ! systemctl is-active --quiet auditd; then
  log "ERRO: auditd não está activo"
  systemctl status auditd --no-pager || true
  exit 1
fi

log "auditd activo — regras carregadas:"
auditctl -l 2>/dev/null | grep -E 'impetus_' | tee -a "$LOG" || auditctl -l | tee -a "$LOG"

# Cron audit-watch (a cada 3 min)
WATCH_BIN="/usr/local/bin/impetus-audit-watch.sh"
install -m 0755 "$ROOT/infra/scripts/impetus-audit-watch.sh" "$WATCH_BIN"
CRON_LINE='*/3 * * * * /usr/local/bin/impetus-audit-watch.sh >> /var/log/impetus-audit-watch.log 2>&1'
(crontab -l 2>/dev/null | grep -v impetus-audit-watch; echo "$CRON_LINE") | crontab -
touch /var/log/impetus-audit-watch.log

log "OK — auditd + impetus-audit-watch (*/3 min)"
log "Teste: ausearch -k impetus_delete --start today"
