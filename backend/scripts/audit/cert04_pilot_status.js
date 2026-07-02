#!/usr/bin/env node
'use strict';

/**
 * CERT-04 — Status read-only do piloto (sem mutações).
 * Uso: npm run cert:04:status
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const BACKEND = path.resolve(__dirname, '..', '..');
const LOG_JSON = path.join(BACKEND, 'docs/iecp/CERT-04_PILOT_LOG.json');

function readP0eFlags() {
  const p = path.join(BACKEND, 'docs/P0E_GO_LIVE_MONITORING.md');
  if (!fs.existsSync(p)) return { go_live: false, stable_72h: false };
  const t = fs.readFileSync(p, 'utf8');
  const m72 = fs.existsSync(path.join(BACKEND, 'docs/P0E_FIRST_72H_VALIDATION.md'))
    ? fs.readFileSync(path.join(BACKEND, 'docs/P0E_FIRST_72H_VALIDATION.md'), 'utf8')
    : '';
  return {
    go_live: /"go_live_detected":\s*true/.test(t),
    stable_72h: /"first_72h_stable":\s*true/.test(m72)
  };
}

function getHealth() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:4000/health', { timeout: 5000 }, (res) => {
      let b = '';
      res.on('data', (c) => { b += c; });
      res.on('end', () => resolve({ ok: res.statusCode === 200, status: res.statusCode }));
    }).on('error', (e) => resolve({ ok: false, error: e.message }));
  });
}

async function main() {
  const log = JSON.parse(fs.readFileSync(LOG_JSON, 'utf8'));
  const now = Date.now();
  const end = new Date(log.pilot_end_min).getTime();
  const start = new Date(log.pilot_started_at).getTime();
  const hoursLeft = Math.max(0, (end - now) / 3600000);
  const hoursElapsed = (now - start) / 3600000;
  const pct = Math.min(100, (hoursElapsed / 72) * 100).toFixed(1);

  const matrix = JSON.parse(fs.readFileSync(path.join(BACKEND, 'docs/FUNCTIONAL_MATRIX.json'), 'utf8'));
  const p0e = readP0eFlags();
  const health = await getHealth();
  const lastSnap = (log.snapshots || []).slice(-1)[0];

  const report = {
    generated_at: new Date().toISOString(),
    phase: 'CERT-04',
    verdict: hoursLeft <= 0 ? 'READY_TO_CLOSE' : 'PILOT_WINDOW_OPEN',
    pilot_started_at: log.pilot_started_at,
    pilot_end_min: log.pilot_end_min,
    hours_elapsed: hoursElapsed.toFixed(2),
    hours_until_min_end: hoursLeft.toFixed(2),
    progress_pct: pct,
    health_backend: health.ok,
    matrix_verde: matrix.stats?.statusDist?.VERDE || 0,
    e2e_scenarios: matrix.stats?.certifiedScenarioCount || (matrix.certifiedScenarios || []).length,
    p0e,
    last_tick_at: lastSnap?.at || log.last_tick_at || null,
    next_actions:
      hoursLeft <= 0
        ? ['npm run cert:04:close']
        : ['npm run cert:04:tick (1x/dia)', `npm run cert:04:close após ${log.pilot_end_min}`]
  };

  const mdPath = path.join(BACKEND, 'docs/iecp/CERT-04_PILOT_STATUS.md');
  fs.writeFileSync(
    mdPath,
    `# CERT-04 — Status Piloto

**Atualizado:** ${report.generated_at}

| Métrica | Valor |
|---------|-------|
| Progresso | **${pct}%** (${report.hours_elapsed}h / 72h) |
| Restante | **${report.hours_until_min_end}h** |
| Fecho mínimo | ${log.pilot_end_min} |
| Matriz VERDE | ${report.matrix_verde}/72 |
| E2E cenários | ${report.e2e_scenarios}/10 |
| Health backend | ${health.ok ? '✅' : '❌'} |
| P0E go-live | ${p0e.go_live ? '✅' : '❌'} |
| P0E 72h estável | ${p0e.stable_72h ? '✅' : '❌'} |

**Veredicto:** \`${report.verdict}\`
`
  );

  console.log(JSON.stringify(report, null, 2));
}

main();
