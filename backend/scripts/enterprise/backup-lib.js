'use strict';

/**
 * Biblioteca backup/restore Enterprise — manifesto, checksums, paths.
 * CERT-ONPREM-DATA-01
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const home = require('../../src/config/impetusHome');

const CHUNK_SIZE = 64 * 1024 * 1024; // 64 MiB — streaming para dumps >2 GiB (CERT-ENTERPRISE-BACKUP-01)

/**
 * SHA-256 em streaming — suporta ficheiros >2 GiB sem carregar em memória.
 * @param {string} filePath
 * @returns {string} hex digest
 */
function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(CHUNK_SIZE);
    let pos = 0;
    for (;;) {
      const bytesRead = fs.readSync(fd, buf, 0, CHUNK_SIZE, pos);
      if (bytesRead <= 0) break;
      hash.update(bytesRead === CHUNK_SIZE ? buf : buf.subarray(0, bytesRead));
      pos += bytesRead;
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function backupRoot(customDir) {
  const base = customDir || home.backupsDir();
  fs.mkdirSync(base, { recursive: true });
  return base;
}

function createBackupId(prefix = 'impetus') {
  return `${prefix}_${timestamp()}`;
}

/**
 * @param {string} backupDir
 * @param {Array<{ path: string, type: string, relative?: string }>} files
 */
function writeManifest(backupDir, files, meta = {}) {
  const manifest = {
    version: 1,
    created_at: new Date().toISOString(),
    impetus_home: home.impetusHomePath(),
    enterprise_layout: home.isEnterpriseLayout(),
    build_id: process.env.IMPETUS_BUILD_ID || null,
    items: files.map((f) => {
      const stat = fs.statSync(f.path);
      const rel = f.relative || path.basename(f.path);
      return {
        type: f.type,
        relative: rel,
        size: stat.size,
        sha256: sha256File(f.path),
      };
    }),
    ...meta,
  };
  const manifestPath = path.join(backupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  manifest.items.push({
    type: 'manifest',
    relative: 'manifest.json',
    size: fs.statSync(manifestPath).size,
    sha256: sha256File(manifestPath),
  });
  return manifest;
}

function readManifest(backupDir) {
  const manifestPath = path.join(backupDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifesto não encontrado: ${manifestPath}`);
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function validateManifest(backupDir, { strict = true } = {}) {
  const manifest = readManifest(backupDir);
  const errors = [];
  for (const item of manifest.items || []) {
    if (item.type === 'manifest') continue;
    const fp = path.join(backupDir, item.relative);
    if (!fs.existsSync(fp)) {
      errors.push(`Ficheiro em falta: ${item.relative}`);
      continue;
    }
    const hash = sha256File(fp);
    if (item.sha256 && hash !== item.sha256) {
      errors.push(`Checksum inválido: ${item.relative}`);
    }
  }
  if (strict && errors.length) {
    const err = new Error(`Validação backup falhou:\n${errors.join('\n')}`);
    err.details = errors;
    throw err;
  }
  return { ok: errors.length === 0, manifest, errors };
}

function tarDirectory(sourceDir, destArchive, label) {
  if (!fs.existsSync(sourceDir)) return null;
  execSync(`tar -czf "${destArchive}" -C "${path.dirname(sourceDir)}" "${path.basename(sourceDir)}"`, {
    stdio: 'pipe',
  });
  return {
    path: destArchive,
    type: label,
    relative: path.basename(destArchive),
  };
}

function resolvePaths() {
  return {
    configEnv: home.envFilePath(),
    configLegacy: home.legacyEnvFilePath(),
    uploads: home.uploadsDir(),
    data: home.dataDir(),
    licenses: home.licensesDir(),
    certificates: home.certificatesDir(),
    backups: home.backupsDir(),
  };
}

/** Artefactos canónicos num directorio de backup (CERT-ENTERPRISE-BACKUP-01) */
const BACKUP_ARTIFACTS = Object.freeze([
  { file: 'database.dump', type: 'database' },
  { file: 'uploads.tar.gz', type: 'uploads' },
  { file: 'cognitive_data.tar.gz', type: 'cognitive_data' },
  { file: 'licenses.tar.gz', type: 'licenses' },
  { file: 'certificates.tar.gz', type: 'certificates' },
  { file: 'config.env', type: 'config' },
]);

/**
 * Reconstrói manifest.json para backup existente (ex.: falha NC-V006 pós pg_dump).
 * @param {string} backupDir
 * @param {object} [meta]
 */
function rebuildManifestFromDir(backupDir, meta = {}) {
  const items = [];
  for (const { file, type } of BACKUP_ARTIFACTS) {
    const fp = path.join(backupDir, file);
    if (fs.existsSync(fp)) {
      items.push({ path: fp, type, relative: file });
    }
  }
  if (!items.length) {
    throw new Error(`Nenhum artefacto encontrado em ${backupDir}`);
  }
  const backupId = path.basename(backupDir);
  return writeManifest(backupDir, items, { mode: 'repair', backup_id: backupId, ...meta });
}

module.exports = {
  sha256File,
  sha256Buffer,
  CHUNK_SIZE,
  timestamp,
  backupRoot,
  createBackupId,
  writeManifest,
  readManifest,
  validateManifest,
  rebuildManifestFromDir,
  tarDirectory,
  resolvePaths,
  BACKUP_ARTIFACTS,
  home,
};
