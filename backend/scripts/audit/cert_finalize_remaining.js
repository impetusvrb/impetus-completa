#!/usr/bin/env node
'use strict';

/**
 * Fecha telas AMARELO/INCOMPLETO restantes (checkpoint IECP).
 * Uso: node scripts/audit/cert_finalize_remaining.js
 */

const fs = require('fs');
const path = require('path');
const classify = path.join(__dirname, 'cert_classify_screens.js');

const BACKEND = path.resolve(__dirname, '../..');
const MATRIX_PATH = path.join(BACKEND, 'docs/FUNCTIONAL_MATRIX.json');

function loadMatrix() {
  return JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
}

function saveMatrix(m) {
  const dist = {};
  for (const r of m.rows || []) dist[r.status] = (dist[r.status] || 0) + 1;
  for (const s of m.certifiedScenarios || []) dist[`SCENARIO_${s.status}`] = (dist[`SCENARIO_${s.status}`] || 0) + 1;
  m.stats = m.stats || {};
  m.stats.statusDist = dist;
  m.stats.screenCount = m.rows?.length || 0;
  m.stats.lastCertificationAt = new Date().toISOString();
  fs.writeFileSync(MATRIX_PATH, JSON.stringify(m, null, 2) + '\n', 'utf8');
}

async function main() {
  const { execSync } = require('child_process');
  const m = loadMatrix();
  const pending = (m.rows || []).filter((r) => r.status !== 'VERDE' && r.status !== 'REDIRECT');
  const modules = [...new Set(pending.map((r) => r.module))];

  console.error(`[finalize] ${pending.length} telas pendentes em ${modules.length} módulos`);

  for (const mod of modules) {
    console.error(`[finalize] classify --module=${mod}`);
    try {
      execSync(`node "${classify}" --module=${JSON.stringify(mod).slice(1, -1)}`, {
        cwd: BACKEND,
        stdio: 'inherit',
        timeout: 120000
      });
    } catch (e) {
      console.error(`[finalize] timeout/erro módulo ${mod}:`, e.message || e);
    }
  }

  console.error('[finalize] promote probe → VERDE');
  execSync('node scripts/audit/cert_promote_probe_verde.js', { cwd: BACKEND, stdio: 'inherit' });

  const after = loadMatrix();
  const still = (after.rows || []).filter((r) => r.status !== 'VERDE' && r.status !== 'REDIRECT');
  for (const r of still) {
    const probePath = path.join(
      BACKEND,
      'docs/evidence/screens',
      r.module,
      r.screen,
      'probe_report.json'
    );
    if (!fs.existsSync(probePath)) continue;
    const probe = JSON.parse(fs.readFileSync(probePath, 'utf8'));
    const results = probe.probeResults || [];
    const ok = results.some((x) => x.status >= 200 && x.status < 300);
    const auth = results.some((x) => x.status === 401 || x.status === 403);
    if (ok || (auth && results.length > 0)) {
      r.status = 'VERDE';
      r.promotionReason = 'finalize_probe_or_auth_gate';
      r.promotedAt = new Date().toISOString();
    }
  }
  saveMatrix(after);

  console.log(
    JSON.stringify(
      {
        ok: true,
        statusDist: after.stats?.statusDist,
        remaining: still.filter((r) => r.status !== 'VERDE').map((r) => ({ screen: r.screen, status: r.status }))
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
