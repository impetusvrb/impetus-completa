'use strict';

/**
 * IMPETUS_HOME — resolução canónica de paths de persistência Enterprise.
 * CERT-ONPREM-DATA-01
 *
 * Sem IMPETUS_HOME: comportamento legado (backend/uploads, backend/data, backend/.env).
 * Com IMPETUS_HOME: layout ${IMPETUS_HOME}/{config,uploads,data,backups,...}
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(BACKEND_ROOT, '..');

const COGNITIVE_DATA_SUBDIRS = Object.freeze([
  'operational-context',
  'confidence-evolution',
  'inference-validation',
  'runtime-stability',
  'governance-learning',
  'governance-audit',
  'cognitive-os-memory',
  'operational-validation',
]);

function envHomeRaw() {
  return String(process.env.IMPETUS_HOME || '').trim();
}

/** @returns {boolean} */
function isEnterpriseLayout() {
  return Boolean(envHomeRaw());
}

/** @returns {string | null} */
function impetusHomePath() {
  const raw = envHomeRaw();
  return raw ? path.resolve(raw) : null;
}

function configDir() {
  const home = impetusHomePath();
  if (home) return path.join(home, 'config');
  return BACKEND_ROOT;
}

function envFilePath() {
  const home = impetusHomePath();
  if (home) {
    const ent = path.join(home, 'config', '.env');
    if (fs.existsSync(ent)) return ent;
  }
  return path.join(BACKEND_ROOT, '.env');
}

function legacyEnvFilePath() {
  return path.join(BACKEND_ROOT, '.env');
}

function uploadsDir() {
  if (process.env.UPLOADS_DIR) return path.resolve(process.env.UPLOADS_DIR);
  const home = impetusHomePath();
  if (home) return path.join(home, 'uploads');
  return path.join(BACKEND_ROOT, 'uploads');
}

function dataDir() {
  if (process.env.IMPETUS_DATA_DIR) return path.resolve(process.env.IMPETUS_DATA_DIR);
  const home = impetusHomePath();
  if (home) return path.join(home, 'data');
  return path.join(BACKEND_ROOT, 'data');
}

/** @param {string} subdir */
function dataSubdir(subdir) {
  return path.join(dataDir(), subdir);
}

function backupsDir() {
  if (process.env.IMPETUS_BACKUP_DIR) return path.resolve(process.env.IMPETUS_BACKUP_DIR);
  const home = impetusHomePath();
  if (home) return path.join(home, 'backups');
  return path.join(BACKEND_ROOT, 'backups');
}

function logsDir() {
  const home = impetusHomePath();
  if (home) return path.join(home, 'logs');
  return path.join(BACKEND_ROOT, 'logs');
}

function licensesDir() {
  const home = impetusHomePath();
  if (home) return path.join(home, 'licenses');
  return path.join(BACKEND_ROOT, 'licenses');
}

function certificatesDir() {
  const home = impetusHomePath();
  if (home) return path.join(home, 'certificates');
  return path.join(BACKEND_ROOT, 'certificates');
}

function tempDir() {
  const home = impetusHomePath();
  if (home) return path.join(home, 'temp');
  return path.join(BACKEND_ROOT, 'temp');
}

function runtimeDir() {
  const home = impetusHomePath();
  if (home) return path.join(home, 'runtime');
  return path.join(BACKEND_ROOT, 'runtime');
}

function appDir() {
  const home = impetusHomePath();
  if (home) return path.join(home, 'app');
  return REPO_ROOT;
}

function scriptsDir() {
  const home = impetusHomePath();
  if (home) return path.join(home, 'scripts');
  return path.join(BACKEND_ROOT, 'scripts', 'enterprise');
}

function monitoringDir() {
  const home = impetusHomePath();
  if (home) return path.join(home, 'monitoring');
  return path.join(REPO_ROOT, 'infra', 'observability');
}

/**
 * Raízes de upload para leitura (primary + legado).
 * @returns {string[]}
 */
function uploadCandidateDirs() {
  const seen = new Set();
  const out = [];
  for (const d of [
    uploadsDir(),
    path.join(BACKEND_ROOT, 'uploads'),
    path.join(REPO_ROOT, 'uploads'),
  ]) {
    const n = path.normalize(d);
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/** @param {...string} segments */
function uploadSubdir(...segments) {
  return path.join(uploadsDir(), ...segments);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Cria árvore IMPETUS_HOME (idempotente). No-op sem IMPETUS_HOME definido.
 * @returns {{ created: string[], layout: string }}
 */
function ensureEnterpriseDirs() {
  const home = impetusHomePath();
  if (!home) {
    ensureDataSubdirs();
    try {
      ensureDir(uploadsDir());
    } catch {
      /* ignore */
    }
    return { created: [], layout: 'legacy' };
  }

  const dirs = [
    path.join(home, 'config'),
    path.join(home, 'app'),
    uploadsDir(),
    logsDir(),
    path.join(home, 'database'),
    backupsDir(),
    licensesDir(),
    certificatesDir(),
    dataDir(),
    tempDir(),
    scriptsDir(),
    monitoringDir(),
    runtimeDir(),
    path.join(logsDir(), 'backend'),
    path.join(logsDir(), 'frontend'),
    path.join(logsDir(), 'nginx'),
    path.join(backupsDir(), 'db'),
    path.join(backupsDir(), 'config'),
    path.join(backupsDir(), 'data'),
    path.join(backupsDir(), 'uploads'),
  ];

  const created = [];
  for (const d of dirs) {
    try {
      if (!fs.existsSync(d)) {
        ensureDir(d);
        created.push(d);
      }
    } catch {
      /* read-only FS — não abortar boot */
    }
  }
  ensureDataSubdirs();
  return { created, layout: 'enterprise' };
}

function ensureDataSubdirs() {
  for (const sub of COGNITIVE_DATA_SUBDIRS) {
    try {
      ensureDir(dataSubdir(sub));
    } catch {
      /* ignore */
    }
  }
}

function describeLayout() {
  return {
    enterprise: isEnterpriseLayout(),
    impetus_home: impetusHomePath(),
    config_dir: configDir(),
    env_file: envFilePath(),
    uploads_dir: uploadsDir(),
    data_dir: dataDir(),
    backups_dir: backupsDir(),
    upload_candidates: uploadCandidateDirs(),
    cognitive_subdirs: COGNITIVE_DATA_SUBDIRS,
  };
}

module.exports = {
  BACKEND_ROOT,
  REPO_ROOT,
  COGNITIVE_DATA_SUBDIRS,
  isEnterpriseLayout,
  impetusHomePath,
  configDir,
  envFilePath,
  legacyEnvFilePath,
  uploadsDir,
  dataDir,
  dataSubdir,
  backupsDir,
  logsDir,
  licensesDir,
  certificatesDir,
  tempDir,
  runtimeDir,
  appDir,
  scriptsDir,
  monitoringDir,
  uploadCandidateDirs,
  uploadSubdir,
  ensureEnterpriseDirs,
  ensureDataSubdirs,
  describeLayout,
};
