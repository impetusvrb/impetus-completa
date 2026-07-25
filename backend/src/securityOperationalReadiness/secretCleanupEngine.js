'use strict';

/**
 * APPSEC-02A — Enterprise Secret Cleanup Engine
 * Inventaria artefactos .env; NUNCA remove automaticamente.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CLASSIFICATION = Object.freeze({
  ACTIVE: 'ACTIVE',
  BACKUP: 'BACKUP',
  ARCHIVED: 'ARCHIVED',
  UNSAFE: 'UNSAFE'
});

const BACKUP_PATTERNS = [
  /\.env\.(bak|backup|bkp)/i,
  /\.env\.sec\d+/i,
  /\.env\.pre-/i,
  /\.env\.edge-agent/i,
  /backup_pre_/i,
  /sec21-backup/i
];

function sha256File(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch {
    return null;
  }
}

function classifyEnvFile(name, filePath) {
  if (name === '.env') return CLASSIFICATION.ACTIVE;
  if (name === '.env.example') return CLASSIFICATION.ARCHIVED;
  if (/\.env\.(local|development|test)$/i.test(name)) return CLASSIFICATION.ARCHIVED;
  if (BACKUP_PATTERNS.some((re) => re.test(name))) return CLASSIFICATION.UNSAFE;
  if (name.startsWith('.env.') && name !== '.env.example') return CLASSIFICATION.BACKUP;
  return CLASSIFICATION.BACKUP;
}

/**
 * @param {string} [backendRoot]
 */
function inventoryEnvArtifacts(backendRoot) {
  const root = backendRoot || path.join(__dirname, '../..');
  const frontendRoot = path.join(root, '../frontend');
  const dirs = [root, frontendRoot].filter((d) => fs.existsSync(d));
  const items = [];

  for (const dir of dirs) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!name.startsWith('.env')) continue;
      const full = path.join(dir, name);
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      if (!stat.isFile()) continue;
      const classification = classifyEnvFile(name, full);
      items.push({
        name,
        path: full,
        relative: path.relative(root, full),
        classification,
        size_bytes: stat.size,
        modified_at: stat.mtime.toISOString(),
        sha256_prefix: sha256File(full)?.slice(0, 16) || null,
        contains_secrets: classification !== CLASSIFICATION.ARCHIVED && name !== '.env.example'
      });
    }
  }

  return items.sort((a, b) => a.classification.localeCompare(b.classification));
}

function buildCleanupPlan(inventory) {
  const unsafe = inventory.filter((i) => i.classification === CLASSIFICATION.UNSAFE);
  const backups = inventory.filter((i) => i.classification === CLASSIFICATION.BACKUP);
  const active = inventory.filter((i) => i.classification === CLASSIFICATION.ACTIVE);

  const steps = [];
  if (unsafe.length) {
    steps.push({
      order: 1,
      action: 'ARCHIVE_OR_DELETE',
      target: 'UNSAFE',
      files: unsafe.map((f) => f.path),
      command: 'scripts/security/cleanup-env-artifacts.sh --dry-run',
      rollback: 'scripts/security/cleanup-env-artifacts.sh --rollback'
    });
  }
  if (backups.length) {
    steps.push({
      order: 2,
      action: 'REVIEW_AND_REMOVE',
      target: 'BACKUP',
      files: backups.map((f) => f.path),
      note: 'Confirmar rotação de segredos antes de --apply'
    });
  }

  return {
    schema_version: 'secret_cleanup_plan_v1',
    generated_at: new Date().toISOString(),
    active_env_files: active.map((f) => f.path),
    unsafe_count: unsafe.length,
    backup_count: backups.length,
    auto_remove: false,
    steps,
    recommendation: unsafe.length
      ? 'Executar cleanup-env-artifacts.sh --dry-run; após rotação de segredos, --apply'
      : backups.length
        ? 'Rever backups BACKUP; arquivar em vault encriptado ou eliminar com --apply'
        : 'Nenhuma acção de limpeza necessária'
  };
}

function generateSecretCleanupReport(options = {}) {
  const backendRoot = options.backendRoot || path.join(__dirname, '../..');
  const inventory = inventoryEnvArtifacts(backendRoot);
  const plan = buildCleanupPlan(inventory);
  const summary = {
    total: inventory.length,
    active: inventory.filter((i) => i.classification === CLASSIFICATION.ACTIVE).length,
    backup: inventory.filter((i) => i.classification === CLASSIFICATION.BACKUP).length,
    archived: inventory.filter((i) => i.classification === CLASSIFICATION.ARCHIVED).length,
    unsafe: inventory.filter((i) => i.classification === CLASSIFICATION.UNSAFE).length
  };

  return {
    schema_version: 'secret_cleanup_report_v1',
    generated_at: new Date().toISOString(),
    summary,
    inventory,
    cleanup_plan: plan,
    all_inventoried: true,
    ready_for_cleanup: summary.unsafe === 0 && summary.backup === 0
  };
}

module.exports = {
  CLASSIFICATION,
  inventoryEnvArtifacts,
  buildCleanupPlan,
  generateSecretCleanupReport
};
