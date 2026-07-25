'use strict';

/**
 * APPSEC-01 — Enterprise Secret Management
 * Inventário, scanner e validador de segredos (boot + runtime).
 */

const fs = require('fs');
const path = require('path');
const flags = require('./config/appsecFlags');

const AUDIT_EVENT = 'APPSEC_SECRET_MGMT';

const INSECURE_FALLBACKS = Object.freeze([
  'impetus-default-key-32b',
  'changeme',
  'dev-secret',
  'placeholder',
  'test-secret',
  'insecure'
]);

const REQUIRED_PRODUCTION_SECRETS = Object.freeze([
  { name: 'JWT_SECRET', minLen: 16 },
  { name: 'IMPETUS_ADMIN_JWT_SECRET', minLen: 16 },
  { name: 'TIME_CLOCK_ENC_KEY', minLen: 16, alt: 'ENCRYPTION_KEY' }
]);

const ENV_BACKUP_PATTERNS = [
  /^\.env\.(bak|backup|bkp|sec\d+-backup|pre-promotion|edge-agent)/i,
  /^\.env\.bak-/i,
  /^\.env\.backup_/i,
  /^\.env\.bkp\./i,
  /^\.env\.sec/i,
  /^\.env\.pre-/i
];
const EVIDENCE_SCAN_EXTENSIONS = new Set(['.json', '.txt', '.log', '.md']);
const EVIDENCE_SECRET_PATTERN =
  /\b(?:pm2_env|JWT_SECRET|DB_PASSWORD|DB_APP_PASSWORD|PGPASSWORD|OPENAI_API_KEY|ANTHROPIC_API_KEY|D_ID_API_KEY|ELEVEN_API_KEY|GITHUB_WORKFLOW_TOKEN|IMPETUS_ADMIN_JWT_SECRET|DATA_ENCRYPTION_KEY|TIME_CLOCK_ENC_KEY)\b/i;

function auditSecret(event, meta) {
  try {
    console.info(`[${AUDIT_EVENT}]`, JSON.stringify({ event, at: new Date().toISOString(), ...meta }));
  } catch (_) { /* never break */ }
}

function isInsecureValue(value) {
  const t = String(value || '').trim();
  if (!t) return true;
  if (t.length < 8) return true;
  return INSECURE_FALLBACKS.some((p) => t.toLowerCase().includes(p.toLowerCase()));
}

/**
 * @param {string} backendRoot
 */
function scanEnvBackupFiles(backendRoot) {
  const findings = [];
  const envDir = backendRoot || path.join(__dirname, '../..');
  let entries = [];
  try {
    entries = fs.readdirSync(envDir);
  } catch {
    return findings;
  }
  for (const name of entries) {
    if (!name.startsWith('.env')) continue;
    if (name === '.env.example') continue;
    const isBackup = ENV_BACKUP_PATTERNS.some((re) => re.test(name));
    if (isBackup || name !== '.env') {
      findings.push({
        type: 'ENV_BACKUP_FILE',
        path: path.join(envDir, name),
        severity: 'high',
        message: `Ficheiro de ambiente legado/backups detectado: ${name}`
      });
    }
  }
  return findings;
}

/**
 * @param {string} docsRoot
 */
function scanEvidenceSecretLeaks(docsRoot) {
  const findings = [];
  const evidenceDir = docsRoot || path.join(__dirname, '../../docs/evidence');
  if (!fs.existsSync(evidenceDir)) return findings;

  const walk = (dir, depth = 0) => {
    if (depth > 4) return;
    let items = [];
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      if (!EVIDENCE_SCAN_EXTENSIONS.has(path.extname(item.name).toLowerCase())) continue;
      try {
        const stat = fs.statSync(full);
        if (stat.size > 5 * 1024 * 1024) continue;
        const content = fs.readFileSync(full, 'utf8');
        if (EVIDENCE_SECRET_PATTERN.test(content)) {
          findings.push({
            type: 'EVIDENCE_SECRET_LEAK',
            path: full,
            severity: 'critical',
            message: 'Artefacto de evidência pode conter segredos ou pm2_env'
          });
        }
      } catch (_) { /* skip */ }
    }
  };
  walk(evidenceDir);
  return findings;
}

function buildSecretInventory() {
  const inventory = [];
  for (const spec of REQUIRED_PRODUCTION_SECRETS) {
    const val = process.env[spec.name] || (spec.alt ? process.env[spec.alt] : '');
    inventory.push({
      name: spec.name,
      present: Boolean(String(val || '').trim()),
      secure: !isInsecureValue(val),
      minLen: spec.minLen
    });
  }
  return inventory;
}

/**
 * @returns {{ ok: boolean, errors: string[], warnings: string[], inventory: object[], scans: object[] }}
 */
function validateSecrets(options = {}) {
  const errors = [];
  const warnings = [];
  const backendRoot = options.backendRoot || path.join(__dirname, '../..');
  const isProd = flags.isProduction();
  const scans = [];

  if (flags.isSecretManagementEnabled()) {
    const envBackups = scanEnvBackupFiles(backendRoot);
    const evidenceLeaks = scanEvidenceSecretLeaks(path.join(backendRoot, 'docs/evidence'));
    scans.push(...envBackups, ...evidenceLeaks);
    for (const f of envBackups) {
      (isProd ? errors : warnings).push(f.message);
    }
    for (const f of evidenceLeaks) {
      warnings.push(f.message);
    }
  }

  const inventory = buildSecretInventory();
  if (isProd) {
    for (const spec of REQUIRED_PRODUCTION_SECRETS) {
      const val = process.env[spec.name] || (spec.alt ? process.env[spec.alt] : '');
      if (!String(val || '').trim()) {
        errors.push(`${spec.name} ausente em produção`);
      } else if (isInsecureValue(val)) {
        errors.push(`${spec.name} usa valor inseguro ou fallback previsível`);
      } else if (val.length < spec.minLen) {
        errors.push(`${spec.name} demasiado curto (mín. ${spec.minLen})`);
      }
    }
    const tcKey = process.env.TIME_CLOCK_ENC_KEY || process.env.ENCRYPTION_KEY || '';
    if (!tcKey.trim() || tcKey.includes('impetus-default-key')) {
      errors.push('TIME_CLOCK_ENC_KEY/ENCRYPTION_KEY ausente ou fallback default em produção');
    }
  }

  auditSecret('VALIDATE', { ok: errors.length === 0, errorCount: errors.length, warningCount: warnings.length });
  return { ok: errors.length === 0, errors, warnings, inventory, scans };
}

/**
 * Falha boot em produção se segredos inválidos.
 */
function validateSecretsOrThrow(options = {}) {
  if (!flags.isSecretManagementEnabled()) return { ok: true, skipped: true };
  const allowPartial = /^(1|true|yes)$/i.test(String(process.env.ALLOW_PARTIAL_ENV || '').trim());
  if (allowPartial) return { ok: true, skipped: true, reason: 'ALLOW_PARTIAL_ENV' };
  const result = validateSecrets(options);
  if (!flags.isProduction()) {
    if (result.warnings.length) {
      console.warn('[APPSEC_SECRET_MGMT] Avisos:\n' + result.warnings.map((w) => `  - ${w}`).join('\n'));
    }
    return result;
  }
  if (!result.ok) {
    auditSecret('BOOT_FAIL', { errors: result.errors });
    const err = new Error(
      'APPSEC-01 Secret Management: configuração insegura em produção.\n' +
      result.errors.map((e) => `  - ${e}`).join('\n')
    );
    err.name = 'AppsecSecretError';
    throw err;
  }
  return result;
}

module.exports = {
  AUDIT_EVENT,
  INSECURE_FALLBACKS,
  EVIDENCE_SCAN_EXTENSIONS,
  EVIDENCE_SECRET_PATTERN,
  isInsecureValue,
  scanEnvBackupFiles,
  scanEvidenceSecretLeaks,
  buildSecretInventory,
  validateSecrets,
  validateSecretsOrThrow
};
