#!/usr/bin/env node
'use strict';

/**
 * Phase Z.0 — validation + dry-run bundle (no real deploy)
 * npm run phase-z0:validate
 */

const { execSync } = require('child_process');
const { createSupervisedSnapshot, listSupervisedBackups } = require('../src/phaseZ0/supervisedBackupCoordinator');
const { assessPm2ReloadReadiness } = require('../src/phaseZ0/pm2ReloadReadiness');

const BACKEND_TESTS = [
  'test:production-deployment',
  'test:tenant-cognitive-rollout',
  'test:runtime-operational-tuning',
  'test:runtime-consolidation',
  'test:kpi-governance-rollout',
  'test:kpi-runtime-stabilization',
  'test:summary-governance-rollout',
  'test:chat-cognitive-alignment',
  'test:runtime-observation',
  'test:operational-identity',
  'test:menu-governance'
];

const DRY_SCRIPTS = [
  'controlled-activation:deploy:dry',
  'kpi-governance:deploy:dry',
  'summary-governance:deploy:dry',
  'kpi-stabilization:deploy:dry'
];

function run(cmd, cwd) {
  console.log(`\n>> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', encoding: 'utf8' });
}

function main() {
  const backendRoot = require('path').join(__dirname, '..');
  const repoRoot = require('path').join(backendRoot, '..');
  let failed = false;

  console.log('=== Phase Z.0 — ETAPA 1: Backend tests ===');
  for (const t of BACKEND_TESTS) {
    try {
      run(`npm run ${t}`, backendRoot);
    } catch {
      failed = true;
      console.error(`FAILED: ${t}`);
    }
  }

  console.log('\n=== Phase Z.0 — ETAPA 2: Deploy dry runs ===');
  for (const s of DRY_SCRIPTS) {
    try {
      run(`npm run ${s}`, backendRoot);
    } catch {
      failed = true;
      console.error(`FAILED dry: ${s}`);
    }
  }

  console.log('\n=== Phase Z.0 — ETAPA 3: Supervised backup ===');
  const snap = createSupervisedSnapshot('phase-z0-pre-reload');
  console.log(JSON.stringify(snap, null, 2));
  console.log('Recent backups:', listSupervisedBackups(5).map((b) => b.name));

  console.log('\n=== Phase Z.0 — ETAPA 9: PM2 reload readiness (no execute) ===');
  const readiness = assessPm2ReloadReadiness({ skip_http_check: true, skip_pm2_check: true, force: true });
  console.log(JSON.stringify(readiness, null, 2));

  console.log('\n=== Phase Z.0 — Frontend build (optional) ===');
  try {
    run('npm run build', require('path').join(repoRoot, 'frontend'));
  } catch (e) {
    console.warn('Frontend build skipped or failed:', e.message);
  }

  if (failed) process.exit(1);
  console.log('\nPhase Z.0 validation bundle: OK');
}

main();
