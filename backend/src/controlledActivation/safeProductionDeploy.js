'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKEND_ROOT = path.join(__dirname, '..', '..');
const REPO_ROOT = path.join(BACKEND_ROOT, '..');
const FRONTEND_ROOT = path.join(REPO_ROOT, 'frontend');

function createBackup(label = 'controlled-activation') {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const dest = path.join(BACKEND_ROOT, 'backups', `${label}-${date}`);
  fs.mkdirSync(dest, { recursive: true });
  const envPath = path.join(BACKEND_ROOT, '.env');
  if (fs.existsSync(envPath)) fs.copyFileSync(envPath, path.join(dest, '.env.backup'));
  return { backup_path: dest, created: true };
}

function verifyFrontendBuild() {
  const dist = path.join(FRONTEND_ROOT, 'dist', 'index.html');
  return { ok: fs.existsSync(dist), path: dist };
}

function planPm2Reload(dryRun = true) {
  return {
    command: 'pm2 reload impetus-backend --update-env',
    dry_run: dryRun,
    atomic: true,
    rollback: 'pm2 reload impetus-backend --update-env (restaurar .env do backup)'
  };
}

function runHealthCheck(port = 4000) {
  try {
    const out = execSync(`curl -sf http://127.0.0.1:${port}/api/health || curl -sf http://127.0.0.1:${port}/health`, {
      encoding: 'utf8',
      timeout: 10000
    });
    return { ok: true, snippet: out.slice(0, 200) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function executeSafeDeploySteps(options = {}) {
  const steps = [];
  steps.push({ step: 'backup', result: options.skip_backup ? { skipped: true } : createBackup() });
  if (!options.skip_build) {
    try {
      execSync('npm run build', { cwd: FRONTEND_ROOT, encoding: 'utf8', stdio: 'pipe' });
      steps.push({ step: 'frontend_build', result: { ok: true } });
    } catch (e) {
      steps.push({ step: 'frontend_build', result: { ok: false, error: e.message } });
    }
  } else {
    steps.push({ step: 'frontend_build', result: { skipped: true } });
  }
  steps.push({ step: 'frontend_verify', result: verifyFrontendBuild() });
  if (!options.skip_pm2 && !options.dry_run) {
    try {
      execSync('pm2 reload impetus-backend --update-env', { encoding: 'utf8', stdio: 'pipe' });
      steps.push({ step: 'pm2_reload', result: { ok: true } });
    } catch (e) {
      steps.push({ step: 'pm2_reload', result: { ok: false, error: e.message } });
    }
  } else {
    steps.push({ step: 'pm2_reload', result: planPm2Reload(true) });
  }
  steps.push({ step: 'health_check', result: runHealthCheck(options.port) });
  return { steps, rollback_ready: true };
}

module.exports = {
  createBackup,
  verifyFrontendBuild,
  planPm2Reload,
  runHealthCheck,
  executeSafeDeploySteps,
  BACKEND_ROOT,
  REPO_ROOT
};
