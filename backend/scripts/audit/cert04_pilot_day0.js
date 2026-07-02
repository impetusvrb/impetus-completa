#!/usr/bin/env node
'use strict';

/**
 * CERT-04 — Dia 0: regista início do piloto 72h e snapshot de evidências.
 * Uso: npm run cert:04:day0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKEND = path.resolve(__dirname, '..', '..');
const DOCS = path.join(BACKEND, 'docs/iecp');
const LOG_JSON = path.join(DOCS, 'CERT-04_PILOT_LOG.json');
const LOG_MD = path.join(DOCS, 'CERT-04_PILOT_LOG.md');

function sh(cmd) {
  return execSync(cmd, { cwd: BACKEND, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
}

function readP0e() {
  const p = path.join(BACKEND, 'docs/P0E_GO_LIVE_MONITORING.md');
  if (!fs.existsSync(p)) return { go_live_detected: false };
  const txt = fs.readFileSync(p, 'utf8');
  const m = txt.match(/```json\n([\s\S]*?)\n```/g);
  if (!m || m.length < 2) return { go_live_detected: false };
  try {
    return JSON.parse(m[1].replace(/```json\n?/, '').replace(/\n```$/, ''));
  } catch {
    return { go_live_detected: /"go_live_detected":\s*true/.test(txt) };
  }
}

function main() {
  fs.mkdirSync(DOCS, { recursive: true });

  let log = {};
  if (fs.existsSync(LOG_JSON)) {
    try { log = JSON.parse(fs.readFileSync(LOG_JSON, 'utf8')); } catch { /* ignore */ }
  }

  const now = new Date().toISOString();
  if (!log.pilot_started_at) {
    log.pilot_started_at = now;
    log.pilot_end_min = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
  }

  const matrix = JSON.parse(fs.readFileSync(path.join(BACKEND, 'docs/FUNCTIONAL_MATRIX.json'), 'utf8'));
  const driftOk = (() => {
    try { sh('npm run cert:drift'); return true; } catch { return false; }
  })();

  log.snapshots = log.snapshots || [];
  log.snapshots.push({
    at: now,
    phase: 'day0',
    matrix_stats: matrix.stats,
    p0e: readP0e(),
    drift_ok: driftOk,
    pm2: sh('pm2 jlist 2>/dev/null | head -c 500')
  });

  fs.writeFileSync(LOG_JSON, JSON.stringify(log, null, 2));
  fs.writeFileSync(
    LOG_MD,
    `# CERT-04 Pilot Log

**Início:** ${log.pilot_started_at}  
**Fim mínimo (72h):** ${log.pilot_end_min}  
**Último snapshot:** ${now}

## Estado dia 0

- Drift gate: ${driftOk ? '✅' : '❌'}
- Matriz: ${JSON.stringify(matrix.stats?.statusDist || {})}
- P0E go-live: ${readP0e().go_live_detected ? '✅' : '❌'}

Ver JSON completo: \`CERT-04_PILOT_LOG.json\`
`
  );

  console.log(JSON.stringify({ ok: true, pilot_started_at: log.pilot_started_at, drift_ok: driftOk }, null, 2));
}

main();
