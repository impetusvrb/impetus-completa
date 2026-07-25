#!/usr/bin/env bash
# Snapshot de baseline comportamental (Fase B) — alimenta anomalias no Centro de Segurança
# Cron sugerido: 0 */6 * * * root bash /var/www/impetus-completa/infra/scripts/impetus-security-baseline-snapshot.sh
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/impetus-completa}"
OUT_DIR="/var/lib/impetus/security-baseline"
LOCK_FILE="/var/run/impetus-security-baseline-snapshot.lock"
mkdir -p "$OUT_DIR"

# Evita sobreposição: se uma execução anterior ainda estiver ativa, não abre novo pool PG.
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo '{"ok":false,"skipped":true,"reason":"previous_snapshot_still_running"}'
  exit 0
fi

cd "$REPO_ROOT/backend"
export NODE_PATH="$REPO_ROOT/backend/node_modules"
export REPO_ROOT OUT_DIR

node <<'NODE'
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.env.REPO_ROOT, 'backend/.env') });
const db = require('./src/db');

(async () => {
  const alerts = {};
  const logPath = process.env.IMPETUS_THREAT_WATCH_LOG || '/var/log/impetus-threat-watch.log';
  if (fs.existsSync(logPath)) {
    const raw = fs.readFileSync(logPath, 'utf8').split('\n').slice(-5000);
    const re = /ALERT\s+\S+\s+(\S+)\s+/;
    for (const line of raw) {
      const m = line.match(re);
      if (m) alerts[m[1]] = (alerts[m[1]] || 0) + 1;
    }
  }

  const loginR = await db.query(
    `SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS c
     FROM admin_logs
     WHERE acao IN ('login_falhou', 'login_bloqueado_bot')
       AND created_at > now() - interval '7 days'
     GROUP BY 1 ORDER BY 1`
  );

  const out = {
    event: 'SECURITY_BASELINE_SNAPSHOT',
    generated_at: new Date().toISOString(),
    login_failed_by_day: loginR.rows,
    alert_baselines: alerts
  };

  const outDir = process.env.OUT_DIR || '/var/lib/impetus/security-baseline';
  fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ok: true, alert_types: Object.keys(alerts).length, days: loginR.rows.length }));
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await db.pool.end();
    } catch (_) { /* ignore */ }
  });
NODE
