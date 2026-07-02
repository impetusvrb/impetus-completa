#!/usr/bin/env node
'use strict';

/**
 * CERT-04 — Tick periódico do piloto (drift + P0E + evidências E2E).
 * Uso: npm run cert:04:tick [--e2e]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKEND = path.resolve(__dirname, '..', '..');
const DOCS = path.join(BACKEND, 'docs/iecp');
const LOG_JSON = path.join(DOCS, 'CERT-04_PILOT_LOG.json');
const EVIDENCE_DOMAINS = [
  'quality/nc-create',
  'safety/lifecycle',
  'esg/emission-waste-consumption',
  'manuia/diagnosis-workorder',
  'executive/dashboard-profile',
  'tpm/preventive-lifecycle',
  'dsr/data-subject-request',
  'billing/asaas-webhook',
  'governance/event-policy-decision',
  'aioi/correlation-insight'
];

function sh(cmd, inherit = false) {
  return execSync(cmd, {
    cwd: BACKEND,
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe']
  }).toString().trim();
}

function readJsonBlock(file, index = 1) {
  if (!fs.existsSync(file)) return null;
  const txt = fs.readFileSync(file, 'utf8');
  const blocks = txt.match(/```json\n([\s\S]*?)\n```/g);
  if (!blocks || blocks.length <= index) return null;
  try {
    return JSON.parse(blocks[index].replace(/```json\n?/, '').replace(/\n```$/, ''));
  } catch {
    return null;
  }
}

function checkEvidence() {
  const missing = [];
  const ok = [];
  for (const d of EVIDENCE_DOMAINS) {
    const p = path.join(BACKEND, 'docs/evidence', d, 'report.json');
    if (!fs.existsSync(p)) {
      missing.push(d);
      continue;
    }
    try {
      const r = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (r.ok === true || r.pass === true || r.status === 'VERDE') ok.push(d);
      else missing.push(d);
    } catch {
      missing.push(d);
    }
  }
  return { ok, missing, total: EVIDENCE_DOMAINS.length };
}

function main() {
  const runE2e = process.argv.includes('--e2e');
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

  let driftOk = false;
  try {
    sh('npm run cert:drift');
    driftOk = true;
  } catch {
    driftOk = false;
  }

  let e2eOk = null;
  if (runE2e) {
    try {
      sh('npm run cert:e2e', true);
      e2eOk = true;
    } catch {
      e2eOk = false;
    }
    try {
      sh('node scripts/audit/cert_promote_probe_verde.js');
    } catch { /* ignore */ }
  }

  try {
    sh('node scripts/audit/seed_first_ioe_cert04.js --force');
    sh('pm2 restart impetus-backend --update-env 2>/dev/null || true');
    execSync('sleep 10');
  } catch { /* ignore */ }

  sh('node scripts/p0e_go_live_monitoring.js');

  const matrix = JSON.parse(fs.readFileSync(path.join(BACKEND, 'docs/FUNCTIONAL_MATRIX.json'), 'utf8'));
  const p0eGo = readJsonBlock(path.join(BACKEND, 'docs/P0E_GO_LIVE_MONITORING.md'), 1);
  const p0e72 = readJsonBlock(path.join(BACKEND, 'docs/P0E_FIRST_72H_VALIDATION.md'), 0);
  const evidence = checkEvidence();

  const snapshot = {
    at: now,
    phase: runE2e ? 'tick+e2e' : 'tick',
    matrix_stats: matrix.stats,
    drift_ok: driftOk,
    e2e_ok: e2eOk,
    p0e: {
      go_live_detected: p0eGo?.go_live_detected === true,
      first_72h_stable: p0e72?.first_72h_stable === true
    },
    evidence: {
      domains_ok: evidence.ok.length,
      domains_total: evidence.total,
      missing: evidence.missing
    },
    hours_elapsed: ((Date.now() - new Date(log.pilot_started_at).getTime()) / 3600000).toFixed(2),
    hours_until_min_end: Math.max(
      0,
      (new Date(log.pilot_end_min).getTime() - Date.now()) / 3600000
    ).toFixed(2)
  };

  log.snapshots = log.snapshots || [];
  log.snapshots.push(snapshot);
  log.last_tick_at = now;
  fs.writeFileSync(LOG_JSON, JSON.stringify(log, null, 2));

  const reportPath = path.join(DOCS, 'CERT-04_PILOT_TICK.json');
  fs.writeFileSync(reportPath, JSON.stringify({ generated_at: now, snapshot }, null, 2));

  console.log(JSON.stringify({ ok: true, snapshot }, null, 2));
  process.exit(driftOk && p0eGo?.go_live_detected ? 0 : 1);
}

main();
