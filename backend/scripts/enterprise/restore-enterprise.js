#!/usr/bin/env node
'use strict';

/**
 * Restore Enterprise — parcial ou completo com dry-run.
 * CERT-ONPREM-DATA-01
 *
 * Uso:
 *   node scripts/enterprise/restore-enterprise.js --backup=/path/to/backup [--dry-run] [--yes]
 *   node scripts/enterprise/restore-enterprise.js --backup=/path --only=config,uploads
 */

require('../../src/config/loadEnv').loadImpetusEnv();

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const lib = require('./backup-lib');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const YES = args.includes('--yes');
const backupArg = args.find((a) => a.startsWith('--backup='));
const onlyArg = args.find((a) => a.startsWith('--only='));
const ONLY = onlyArg
  ? onlyArg
      .split('=')[1]
      .split(',')
      .map((s) => s.trim())
  : null;

function usage() {
  console.log('Uso: restore-enterprise.js --backup=DIR [--dry-run] [--yes] [--only=config,uploads,data,licenses,certificates,database]');
  process.exit(1);
}

async function confirm(message) {
  if (YES || DRY_RUN) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (ans) => {
      rl.close();
      resolve(String(ans).toLowerCase() === 'yes');
    });
  });
}

function extractTar(archive, destParent) {
  fs.mkdirSync(destParent, { recursive: true });
  execSync(`tar -xzf "${archive}" -C "${destParent}"`, { stdio: 'pipe' });
}

async function restoreDatabase(dumpFile) {
  const h = process.env.DB_HOST || '127.0.0.1';
  const p = process.env.DB_PORT || '5432';
  const n = process.env.DB_NAME || 'impetus_db';
  const u = process.env.DB_USER || 'postgres';
  const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || '' };
  execSync(`pg_restore -h "${h}" -p "${p}" -U "${u}" -d "${n}" --clean --if-exists "${dumpFile}"`, {
    stdio: 'inherit',
    env,
  });
}

function shouldRestore(type) {
  if (!ONLY || !ONLY.length) return true;
  const map = {
    database: 'database',
    config: 'config',
    uploads: 'uploads',
    cognitive_data: 'data',
    licenses: 'licenses',
    certificates: 'certificates',
  };
  return ONLY.includes(type) || ONLY.includes(map[type] || type);
}

async function main() {
  if (!backupArg) usage();
  const backupDir = path.resolve(backupArg.split('=')[1]);
  if (!fs.existsSync(backupDir)) {
    console.error('[restore] Backup não encontrado:', backupDir);
    process.exit(1);
  }

  console.log('[restore-enterprise] Validando manifesto...');
  const validation = lib.validateManifest(backupDir, { strict: true });
  console.log('[restore-enterprise] Manifesto OK —', validation.manifest.created_at);

  if (!(await confirm(`Restaurar backup ${path.basename(backupDir)}? Isto pode SOBRESCREVER dados.`))) {
    console.log('[restore] Cancelado.');
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log('[restore] DRY-RUN — nenhum ficheiro alterado');
    validation.manifest.items.forEach((i) => console.log('  -', i.type, i.relative));
    process.exit(0);
  }

  const paths = lib.resolvePaths();

  if (shouldRestore('database')) {
    const dbDump = path.join(backupDir, 'database.dump');
    if (fs.existsSync(dbDump)) {
      console.log('[restore] Base de dados...');
      await restoreDatabase(dbDump);
    }
  }

  const tarMap = [
    { file: 'uploads.tar.gz', dest: paths.uploads, type: 'uploads' },
    { file: 'cognitive_data.tar.gz', dest: paths.data, type: 'data' },
    { file: 'licenses.tar.gz', dest: paths.licenses, type: 'licenses' },
    { file: 'certificates.tar.gz', dest: paths.certificates, type: 'certificates' },
  ];

  for (const t of tarMap) {
    if (!shouldRestore(t.type)) continue;
    const archive = path.join(backupDir, t.file);
    if (!fs.existsSync(archive)) continue;
    console.log('[restore]', t.file, '→', t.dest);
    extractTar(archive, path.dirname(t.dest));
  }

  if (shouldRestore('config')) {
    const cfgSrc = path.join(backupDir, 'config.env');
    if (fs.existsSync(cfgSrc)) {
      const dest = paths.configEnv;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(cfgSrc, dest);
      console.log('[restore] config →', dest);
    }
  }

  console.log('[restore-enterprise] Concluído. Execute verify-enterprise.sh e health-enterprise.sh');
  process.exit(0);
}

main().catch((e) => {
  console.error('[restore-enterprise] ERRO:', e.message || e);
  if (e.details) e.details.forEach((d) => console.error(' ', d));
  process.exit(1);
});
