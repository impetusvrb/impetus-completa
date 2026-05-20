#!/usr/bin/env node
'use strict';

/**
 * Etapas 3–7 — Observação runtime + relatório operacional
 * node scripts/governance-observation-execution.js
 */

const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');

// Activar flags de observação no processo actual (runtime Node)
process.env.IMPETUS_GOVERNANCE_BOOTSTRAP_ACTIVE = 'on';
process.env.IMPETUS_GLOBAL_SHADOW_OBSERVATION = 'on';
process.env.IMPETUS_GOVERNANCE_SHADOW_MODE = 'on';
process.env.IMPETUS_FAILSAFE_GOVERNANCE = 'on';

function httpGet(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 8000 }, (res) => {
      let body = '';
      res.on('data', (c) => {
        body += c;
      });
      res.on('end', () => resolve({ status: res.statusCode, body: body.slice(0, 500) }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: 'timeout' });
    });
  });
}

async function main() {
  console.log('[observation] Starting global shadow observation...');
  const { startGlobalShadowObservation } = require('../src/governanceBootstrap/governanceBootstrapCoordinator');
  const obs = startGlobalShadowObservation();
  console.log(JSON.stringify(obs, null, 2));

  const { writeRuntimeObservationReportDoc, generateRuntimeObservationReport } = require('../src/governanceBootstrap/governanceRuntimeObservationReport');
  const report = writeRuntimeObservationReportDoc(path.join(DOCS, 'governance-runtime-observation-report.md'));

  console.log('\n[observation] Report written:', report.written);
  console.log('[observation] KPI safe:', report.report.kpi_readiness.safe);
  console.log('[observation] Ungoverned files:', report.report.code_scan_summary.ungoverned_count);
  console.log('[observation] Gap count:', report.report.entrypoint_gaps.length);

  const base = process.env.IMPETUS_API_BASE || 'http://127.0.0.1:4000';
  const publicPaths = ['/health', '/api/health', '/api/system/frontend-build'];
  console.log('\n[observation] Public endpoint checks:');
  for (const p of publicPaths) {
    const r = await httpGet(`${base}${p}`);
    console.log(`  ${p} → ${r.status}${r.error ? ` (${r.error})` : ''}`);
  }

  console.log('\n[observation] Internal governance API requires auth — use dashboard or service token.');
  console.log('[observation] Module report available at docs/governance-runtime-observation-report.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
