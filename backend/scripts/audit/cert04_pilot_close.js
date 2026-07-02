#!/usr/bin/env node
'use strict';

/**
 * CERT-04 — Fecho do piloto (após janela mínima 72h + gates).
 * Uso: npm run cert:04:close [--force]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKEND = path.resolve(__dirname, '..', '..');
const DOCS = path.join(BACKEND, 'docs/iecp');
const LOG_JSON = path.join(DOCS, 'CERT-04_PILOT_LOG.json');
const OUT_JSON = path.join(DOCS, 'CERT-04_PILOT_REPORT.json');
const OUT_MD = path.join(DOCS, 'CERT-04_SIGNOFF.md');

function sh(cmd) {
  return execSync(cmd, { cwd: BACKEND, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
}

function readJsonFromMd(file, blockIdx) {
  const txt = fs.readFileSync(file, 'utf8');
  const blocks = txt.match(/```json\n([\s\S]*?)\n```/g);
  if (!blocks?.[blockIdx]) return null;
  try {
    return JSON.parse(blocks[blockIdx].replace(/```json\n?/, '').replace(/\n```$/, ''));
  } catch {
    return null;
  }
}

function main() {
  const force = process.argv.includes('--force');
  const log = JSON.parse(fs.readFileSync(LOG_JSON, 'utf8'));
  const now = new Date();
  const endMin = new Date(log.pilot_end_min);
  const windowOk = force || now >= endMin;

  try {
    sh('node scripts/audit/seed_first_ioe_cert04.js --force');
    sh('pm2 restart impetus-backend --update-env 2>/dev/null || true');
  } catch { /* ignore */ }
  sh('node scripts/p0e_go_live_monitoring.js');
  let driftOk = false;
  try {
    sh('npm run cert:drift');
    driftOk = true;
  } catch { /* ignore */ }

  const matrix = JSON.parse(fs.readFileSync(path.join(BACKEND, 'docs/FUNCTIONAL_MATRIX.json'), 'utf8'));
  const dist = matrix.stats?.statusDist || {};
  const matrixOk = (dist.VERDE || 0) >= 72 && (dist.AMARELO || 0) === 0;

  const p0eGo = readJsonFromMd(path.join(BACKEND, 'docs/P0E_GO_LIVE_MONITORING.md'), 1);
  const p0e72 = readJsonFromMd(path.join(BACKEND, 'docs/P0E_FIRST_72H_VALIDATION.md'), 0);
  const scenarios = matrix.certifiedScenarios?.filter((s) => s.status === 'VERDE').length || 0;

  const gates = {
    pilot_window_elapsed: windowOk,
    drift_gate: driftOk,
    matrix_72_verde: matrixOk,
    e2e_scenarios_verde: scenarios >= 10,
    p0e_go_live: p0eGo?.go_live_detected === true,
    p0e_first_72h_stable: p0e72?.first_72h_stable === true
  };

  const pass = Object.values(gates).every(Boolean);
  const report = {
    generated_at: now.toISOString(),
    phase: 'CERT-04',
    pilot_started_at: log.pilot_started_at,
    pilot_end_min: log.pilot_end_min,
    closed_at: pass ? now.toISOString() : null,
    verdict: pass ? 'PILOT_ACCEPTED' : windowOk ? 'PILOT_GATES_PENDING' : 'PILOT_WINDOW_OPEN',
    gates,
    matrix_stats: matrix.stats,
    signoff_required: pass ? 'operational_owner' : null
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  fs.writeFileSync(
    OUT_MD,
    `# CERT-04 — Sign-off Piloto Industrial

**Gerado:** ${report.generated_at}

## Veredicto

- **Estado:** ${report.verdict}
- **Janela 72h:** ${windowOk ? '✅ decorrida' : `⏳ faltam ${((endMin - now) / 3600000).toFixed(1)}h`}

## Gates

| Gate | Status |
|------|--------|
| Janela piloto 72h | ${gates.pilot_window_elapsed ? '✅' : '❌'} |
| Drift | ${gates.drift_gate ? '✅' : '❌'} |
| Matriz 72 VERDE | ${gates.matrix_72_verde ? '✅' : '❌'} |
| E2E 10 cenários | ${gates.e2e_scenarios_verde ? '✅' : '❌'} |
| P0E go-live | ${gates.p0e_go_live ? '✅' : '❌'} |
| P0E 72h estável | ${gates.p0e_first_72h_stable ? '✅' : '❌'} |

${pass ? '## Sign-off\n\n- [ ] Responsável operacional\n- [ ] Data: __________\n' : '## Acções pendentes\n\nReexecutar `npm run cert:04:tick --e2e` até todos os gates ✅ e janela 72h decorrida.\n'}
`
  );

  log.closed_at = report.closed_at;
  log.verdict = report.verdict;
  fs.writeFileSync(LOG_JSON, JSON.stringify(log, null, 2));

  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

main();
