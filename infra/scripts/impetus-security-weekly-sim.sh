#!/usr/bin/env bash
# Simulador semanal SEC-19 (sintético — sem HTTP em produção)
# Cron: 0 3 * * 0 root bash /var/www/impetus-completa/infra/scripts/impetus-security-weekly-sim.sh
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/impetus-completa}"
cd "$REPO_ROOT/backend"
export NODE_PATH="$REPO_ROOT/backend/node_modules"
export REPO_ROOT

node <<'NODE'
const path = require('path');
require('dotenv').config({ path: path.join(process.env.REPO_ROOT, 'backend/.env') });
const phaseC = require('./src/services/adminPortalSecurityPhaseCService');

(async () => {
  const result = await phaseC.runWeeklySimulation({ force: true });
  console.log(JSON.stringify({
    ok: !result.error,
    score: result.certification?.operational_score,
    decision: result.certification?.decision,
    scenarios: result.scenarios_total
  }));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
NODE
