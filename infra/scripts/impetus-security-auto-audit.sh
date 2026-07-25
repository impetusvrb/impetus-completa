#!/usr/bin/env bash
# Auto-auditoria de segurança (Fase A) — persiste resultado em /var/lib/impetus/security-auto-audit/
# Cron: /etc/cron.d/impetus-security-auto-audit (hourly :15)
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/impetus-completa}"
OUT_DIR="/var/lib/impetus/security-auto-audit"
LOCK_FILE="/var/run/impetus-security-auto-audit.lock"
mkdir -p "$OUT_DIR"

# Evita sobreposição: se uma execução anterior ainda estiver ativa, não abre novo pool PG.
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo '{"ok":false,"skipped":true,"reason":"previous_audit_still_running"}'
  exit 0
fi

cd "$REPO_ROOT/backend"
export NODE_PATH="$REPO_ROOT/backend/node_modules"

node -e "
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join('$REPO_ROOT/backend/.env') });
const db = require('./src/db');
const dash = require('./src/services/adminPortalSecurityDashboardService');

(async () => {
  try {
    const payload = await dash.buildDashboard();
    const audit = payload.auto_audit;
    const out = {
      event: 'SECURITY_AUTO_AUDIT',
      generated_at: new Date().toISOString(),
      security_score: payload.security_score?.total,
      risk_level: payload.risk_level?.level,
      audit
    };
    const latest = path.join('$OUT_DIR', 'latest.json');
    const stamp = path.join('$OUT_DIR', 'audit-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
    fs.writeFileSync(latest, JSON.stringify(out, null, 2));
    fs.writeFileSync(stamp, JSON.stringify(out, null, 2));
    console.log(JSON.stringify({ ok: true, passed: audit.passed, total: audit.total, score: out.security_score }));
  } finally {
    try {
      await db.pool.end();
    } catch (_) { /* ignore */ }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
" 2>&1 | tail -1

# Manter últimos 48 snapshots (~48h se cron hourly)
shopt -s nullglob
snapshots=("$OUT_DIR"/audit-*.json)
if ((${#snapshots[@]} > 48)); then
  printf '%s\n' "${snapshots[@]}" | sort -r | tail -n +49 | xargs -r rm -f
fi
