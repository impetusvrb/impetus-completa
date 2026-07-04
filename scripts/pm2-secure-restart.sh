#!/usr/bin/env bash
# HARDENING-01 — Restart PM2 seguro (sem dump de segredos no stdout)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FORENSICS="${IMPETUS_FORENSICS_DIR:-/var/lib/impetus/forensics}"
mkdir -p "$FORENSICS"

TS="$(date +%s)"
echo "[1/4] Preservar metadados PM2 (sem env completo)"
pm2 jlist 2>/dev/null | python3 -c "
import json,sys
data=json.load(sys.stdin)
out=[]
for p in data:
    env=p.get('pm2_env') or {}
    out.append({
        'name': p.get('name'),
        'pid': p.get('pid'),
        'pm_uptime': env.get('pm_uptime'),
        'status': env.get('status'),
        'pm_exec_path': env.get('pm_exec_path'),
        'node_version': env.get('node_version'),
    })
print(json.dumps(out, indent=2))
" > "$FORENSICS/pm2-meta-$TS.json"

echo "[2/4] Backup dump.pm2 (acesso restrito)"
if [[ -f /root/.pm2/dump.pm2 ]]; then
  cp -a /root/.pm2/dump.pm2 "$FORENSICS/dump.pm2.$TS"
  chmod 600 "$FORENSICS/dump.pm2.$TS" 2>/dev/null || true
fi

echo "[3/4] Reload com --update-env"
pm2 restart ecosystem.config.js --env production --update-env

echo "[4/4] Health check"
sleep 3
curl -sf http://127.0.0.1:4000/health >/dev/null
echo "OK — PM2 reiniciado com segurança"
