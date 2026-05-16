#!/usr/bin/env node
'use strict';

/**
 * Deploy frontend resiliente (blue/green local):
 *   build → dist_next → validate → atomic swap → dist_backup
 *
 * Não apaga dist activo durante o build.
 * Rollback: mv dist_backup_* dist (manual) ou re-run com backup anterior.
 *
 * Uso: node scripts/atomic-deploy-build.cjs
 * Env: VITE_OUT_DIR=dist_next, VITE_ATOMIC_BUILD=true (definidos internamente)
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..');
const distActive = path.join(frontendRoot, 'dist');
const distNext = path.join(frontendRoot, 'dist_next');
const distBackupPrefix = path.join(frontendRoot, 'dist_backup_');

function log(msg) {
  console.log(`[atomic-deploy] ${msg}`);
}

function fail(msg, code = 1) {
  console.error(`[atomic-deploy] ERROR: ${msg}`);
  process.exit(code);
}

function validateDist(dir) {
  const indexHtml = path.join(dir, 'index.html');
  const buildMeta = path.join(dir, 'build-meta.json');
  if (!fs.existsSync(indexHtml)) {
    fail(`index.html ausente em ${dir}`);
  }
  const assetsDir = path.join(dir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fail(`pasta assets/ ausente em ${dir}`);
  }
  const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
  if (jsFiles.length === 0) {
    fail(`nenhum bundle JS em ${assetsDir}`);
  }
  if (!fs.existsSync(buildMeta)) {
    log('WARN: build-meta.json ausente — runtime version guard usará fallback');
  }
  log(`validate OK: ${jsFiles.length} bundles em assets/`);
}

if (fs.existsSync(distNext)) {
  fs.rmSync(distNext, { recursive: true, force: true });
}

log('Building into dist_next...');
const build = spawnSync('npm', ['run', 'build'], {
  cwd: frontendRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_OUT_DIR: 'dist_next',
    VITE_ATOMIC_BUILD: 'true'
  }
});

if (build.status !== 0) {
  fail('vite build falhou', build.status || 1);
}

validateDist(distNext);

if (fs.existsSync(distActive)) {
  const backupName = `${distBackupPrefix}${Date.now()}`;
  log(`Backing up active dist → ${path.basename(backupName)}`);
  fs.renameSync(distActive, backupName);
}

log('Atomic swap: dist_next → dist');
fs.renameSync(distNext, distActive);

log('Deploy concluído. Reinicie impetus-frontend: pm2 restart impetus-frontend --update-env');
