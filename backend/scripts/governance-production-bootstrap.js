#!/usr/bin/env node
'use strict';

/**
 * IMPETUS — Primeiro Deploy Operacional Controlado
 * Shadow-first + observability bootstrap
 *
 * Uso:
 *   node scripts/governance-production-bootstrap.js [--dry-run] [--skip-build] [--skip-pm2]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const REPO = path.join(ROOT, '..');
const FRONTEND = path.join(REPO, 'frontend');
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_BUILD = process.argv.includes('--skip-build');
const SKIP_PM2 = process.argv.includes('--skip-pm2');
const DATE = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const BK = path.join(ROOT, 'backups', `governance-production-bootstrap-${DATE}`);
const DOCS = path.join(ROOT, 'docs');

const BOOTSTRAP_MARKER = 'GOVERNANCE_PRODUCTION_BOOTSTRAP';

const FLAG_BLOCK = `
# ─── ${BOOTSTRAP_MARKER} (shadow-first — Etapa deploy operacional) ───
IMPETUS_GOVERNANCE_BOOTSTRAP_ACTIVE=on
IMPETUS_GLOBAL_SHADOW_OBSERVATION=on
IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION=on
IMPETUS_GOVERNANCE_OPERATIONS=on
IMPETUS_RUNTIME_GOVERNANCE_MONITORING=on
IMPETUS_RUNTIME_OBSERVATION=on
IMPETUS_PRODUCTION_ROLLOUT=on
IMPETUS_GOVERNANCE_STABILIZATION=on
IMPETUS_FINAL_GOVERNANCE_REVIEW=on
IMPETUS_RUNTIME_VALIDATION=on
IMPETUS_ROLLOUT_SAFETY_VALIDATION=on
IMPETUS_GOVERNANCE_SHADOW_MODE=on
IMPETUS_FAILSAFE_GOVERNANCE=on
IMPETUS_GOVERNANCE_READINESS=on
IMPETUS_GOVERNANCE_QUALITY_GATES=on
IMPETUS_GOVERNANCE_AUDIT_FEED=on
IMPETUS_GOVERNANCE_EXPLAINABILITY=on
IMPETUS_GOVERNANCE_INCIDENT_ENGINE=on
IMPETUS_GOVERNANCE_RUNTIME_HEALTH=on
# Enforcement OFF (soft rollout)
IMPETUS_KPI_GOVERNANCE=off
IMPETUS_SUMMARY_GOVERNANCE=off
IMPETUS_CHAT_GOVERNANCE=off
IMPETUS_COGNITIVE_BOUNDARY_GUARD=off
IMPETUS_SOFT_KPI_GOVERNANCE_ROLLOUT=off
`.trim();

function log(msg) {
  console.log(`[governance-bootstrap] ${msg}`);
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function run(cmd, cwd = ROOT) {
  log(`$ ${cmd}`);
  if (DRY_RUN) return '';
  return execSync(cmd, { cwd, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

function httpGet(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', (c) => {
        body += c;
      });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: 'timeout' });
    });
  });
}

function appendFlags(envPath) {
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const re = new RegExp(`# ─── ${BOOTSTRAP_MARKER}[\\s\\S]*?(?=\\n# ───|$)`, 'm');
  content = content.replace(re, '').trimEnd();
  content = `${content}\n\n${FLAG_BLOCK}\n`;
  if (!DRY_RUN) fs.writeFileSync(envPath, content);
}

function atomicFrontendBuild() {
  const dist = path.join(FRONTEND, 'dist');
  const distNew = path.join(FRONTEND, 'dist_new');
  const metaPath = path.join(FRONTEND, 'dist_build_meta.json');

  if (fs.existsSync(distNew)) run(`rm -rf "${distNew}"`, FRONTEND);
  run('npm run build', FRONTEND);

  const builtDist = fs.existsSync(path.join(FRONTEND, 'dist')) ? dist : null;
  if (!builtDist) throw new Error('frontend build did not produce dist');

  if (fs.existsSync(distNew)) run(`rm -rf "${distNew}"`, FRONTEND);
  run(`cp -a "${dist}" "${distNew}"`, FRONTEND);

  const indexPath = path.join(distNew, 'index.html');
  if (!fs.existsSync(indexPath)) throw new Error('dist_new integrity failed: index.html missing');

  const buildId = `gb_${DATE}_${Date.now().toString(36)}`;
  const meta = {
    build_id: buildId,
    built_at: new Date().toISOString(),
    integrity: 'ok',
    path: 'dist_new'
  };
  if (!DRY_RUN) fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  const distBackup = path.join(FRONTEND, `dist_backup_${Date.now()}`);
  if (fs.existsSync(dist) && !DRY_RUN) {
    run(`mv "${dist}" "${distBackup}"`, FRONTEND);
    run(`mv "${distNew}" "${dist}"`, FRONTEND);
    log(`dist swap complete; backup at ${distBackup}`);
  }

  return meta;
}

async function validateEndpoints(base) {
  const paths = [
    '/health',
    '/api/health',
    '/api/system/frontend-build'
  ];
  const results = [];
  for (const p of paths) {
    const r = await httpGet(`${base}${p}`);
    results.push({ path: p, status: r.status, ok: r.status >= 200 && r.status < 400 });
  }
  return results;
}

async function main() {
  log(`DRY_RUN=${DRY_RUN} SKIP_BUILD=${SKIP_BUILD} SKIP_PM2=${SKIP_PM2}`);

  mkdirp(BK);
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, path.join(BK, '.env.backup'));
    log('backed up .env');
  }

  log('=== Etapa 1: Pre-deploy audit ===');
  const { runPreDeployAudit, writePreDeployAuditDoc } = require('../src/governanceBootstrap/preDeployGovernanceAudit');
  const audit = runPreDeployAudit();
  writePreDeployAuditDoc(path.join(DOCS, 'pre-production-governance-audit.md'), audit);
  if (!audit.passed) log('WARN: pre-deploy audit reported issues — review doc');

  log('=== Etapa 2: Build controlado ===');
  let buildMeta = { skipped: SKIP_BUILD || DRY_RUN };
  if (!SKIP_BUILD && !DRY_RUN) {
    try {
      buildMeta = atomicFrontendBuild();
    } catch (e) {
      log(`WARN: frontend build: ${e.message}`);
      buildMeta = { error: e.message };
    }
  }

  log('=== Etapa 3: Backup operacional ===');
  const rolloutConfig = {
    flags: FLAG_BLOCK,
    timestamp: new Date().toISOString()
  };
  if (!DRY_RUN) {
    fs.writeFileSync(path.join(BK, 'rollout-flags.txt'), FLAG_BLOCK);
    fs.writeFileSync(path.join(BK, 'rollout-config.json'), JSON.stringify(rolloutConfig, null, 2));
  }

  log('=== Etapa 4: Activacao segura (env) ===');
  appendFlags(envPath);

  log('=== Etapa 5: PM2 reload ===');
  if (!SKIP_PM2) {
    try {
      run('pm2 reload impetus-backend --update-env');
    } catch (e) {
      log(`WARN: pm2 reload: ${e.message}`);
    }
  }

  const base = process.env.IMPETUS_API_BASE || 'http://127.0.0.1:4000';
  log('=== Etapa 6-7: Validacao + mapping ===');
  const health = await validateEndpoints(base);

  const { writeEntrypointMapDoc } = require('../src/governanceBootstrap/governanceEntrypointMapper');
  writeEntrypointMapDoc(path.join(DOCS, 'runtime-governance-entrypoint-map.md'));

  const { writeBootstrapReportDoc, generateBootstrapReport } = require('../src/governanceBootstrap/governanceBootstrapReporter');
  const report = generateBootstrapReport({ force: true, pm2_health: SKIP_PM2 ? 'skipped' : 'reloaded' });
  writeBootstrapReportDoc(path.join(DOCS, 'governance-production-bootstrap-report.md'), { force: true });

  log('=== Soft KPI evaluation (recommendation only) ===');
  const { evaluateSoftKpiActivation } = require('../src/governanceBootstrap/softKpiActivationEvaluator');
  const kpi = evaluateSoftKpiActivation({ force: true });
  log(`KPI soft activation safe: ${kpi.safe} — action: ${kpi.recommendation.action}`);

  const summary = {
    audit_passed: audit.passed,
    build: buildMeta,
    backup_dir: BK,
    health_checks: health,
    soft_kpi: kpi.recommendation,
    report_path: path.join(DOCS, 'governance-production-bootstrap-report.md')
  };

  if (!DRY_RUN) {
    fs.writeFileSync(path.join(BK, 'bootstrap-summary.json'), JSON.stringify(summary, null, 2));
  }

  console.log('\n=== Bootstrap complete ===');
  console.log(JSON.stringify(summary, null, 2));

  if (!audit.passed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
