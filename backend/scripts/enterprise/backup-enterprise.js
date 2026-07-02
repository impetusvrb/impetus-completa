#!/usr/bin/env node
'use strict';

/**
 * Backup Enterprise — completo ou incremental.
 * CERT-ONPREM-DATA-01
 *
 * Uso:
 *   node scripts/enterprise/backup-enterprise.js [--full|--incremental]
 *   node scripts/enterprise/backup-enterprise.js --repair-manifest=DIR
 */

require('../../src/config/loadEnv').loadImpetusEnv();

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const lib = require('./backup-lib');

const MODE = process.argv.includes('--incremental') ? 'incremental' : 'full';
const OUT_ARG = process.argv.find((a) => a.startsWith('--out='));
const CUSTOM_OUT = OUT_ARG ? OUT_ARG.split('=')[1] : null;

const REPAIR_ARG = process.argv.find((a) => a.startsWith('--repair-manifest='));

async function pgDump(destFile) {
  const h = process.env.DB_HOST || '127.0.0.1';
  const p = process.env.DB_PORT || '5432';
  const n = process.env.DB_NAME || 'impetus_db';
  const u = process.env.DB_USER || 'postgres';
  const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || '' };
  execSync(`pg_dump -h "${h}" -p "${p}" -U "${u}" -d "${n}" -F c -f "${destFile}"`, {
    stdio: 'inherit',
    env,
  });
  return destFile;
}

async function main() {
  lib.home.ensureEnterpriseDirs();

  if (REPAIR_ARG) {
    const backupDir = path.resolve(REPAIR_ARG.split('=').slice(1).join('='));
    console.log('[backup-enterprise] Reparar manifesto:', backupDir);
    const manifest = lib.rebuildManifestFromDir(backupDir);
    lib.validateManifest(backupDir, { strict: true });
    console.log('[backup-enterprise] Manifesto reparado —', manifest.items.length, 'artefactos');
    console.log('[backup-enterprise] manifest:', path.join(backupDir, 'manifest.json'));
    process.exit(0);
  }

  const backupId = lib.createBackupId('backup');
  const backupDir = path.join(lib.backupRoot(CUSTOM_OUT), backupId);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log('[backup-enterprise] Modo:', MODE);
  console.log('[backup-enterprise] Destino:', backupDir);

  const items = [];

  const dbFile = path.join(backupDir, 'database.dump');
  await pgDump(dbFile);
  items.push({ path: dbFile, type: 'database', relative: 'database.dump' });

  const paths = lib.resolvePaths();
  for (const [key, label] of [
    ['uploads', 'uploads'],
    ['data', 'cognitive_data'],
    ['licenses', 'licenses'],
    ['certificates', 'certificates'],
  ]) {
    const src = paths[key];
    if (!fs.existsSync(src)) continue;
    const archive = path.join(backupDir, `${label}.tar.gz`);
    const entry = lib.tarDirectory(src, archive, label);
    if (entry) items.push(entry);
  }

  for (const cfg of [paths.configEnv, paths.configLegacy]) {
    if (cfg && fs.existsSync(cfg)) {
      const dest = path.join(backupDir, path.basename(cfg) === '.env' ? 'config.env' : path.basename(cfg));
      fs.copyFileSync(cfg, dest);
      items.push({ path: dest, type: 'config', relative: path.basename(dest) });
    }
  }

  const manifest = lib.writeManifest(backupDir, items, { mode: MODE, backup_id: backupId });
  console.log('[backup-enterprise] OK —', manifest.items.length, 'artefactos');
  console.log('[backup-enterprise] manifest:', path.join(backupDir, 'manifest.json'));
  process.exit(0);
}

main().catch((e) => {
  console.error('[backup-enterprise] ERRO:', e.message || e);
  process.exit(1);
});
