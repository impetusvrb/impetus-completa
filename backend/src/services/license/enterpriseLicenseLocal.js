'use strict';

/**
 * Validação offline de licença Enterprise — assinatura Ed25519, sem BD.
 * CERT-LICENSE-01 · ADR-009
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const home = require('../../config/impetusHome');
const { normalizeCapabilities } = require('./licenseCapabilities');

const DEFAULT_LICENSE_FILES = ['impetus.license.json', 'license.json'];

function envInt(name, defaultValue) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v >= 0 ? v : defaultValue;
}

function gracePeriodDays() {
  return envInt('LICENSE_GRACE_PERIOD_DAYS', 14);
}

function licenseMode() {
  const m = String(process.env.LICENSE_MODE || 'auto').trim().toLowerCase();
  if (['local', 'remote', 'auto'].includes(m)) return m;
  return 'auto';
}

function licenseFilePath() {
  const explicit = String(process.env.LICENSE_FILE || process.env.LICENSE_FILE_PATH || '').trim();
  if (explicit) return path.resolve(explicit);
  const dir = home.licensesDir();
  for (const name of DEFAULT_LICENSE_FILES) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return path.join(dir, DEFAULT_LICENSE_FILES[0]);
}

function installationIdPath() {
  const explicit = String(process.env.LICENSE_INSTALLATION_ID_FILE || '').trim();
  if (explicit) return path.resolve(explicit);
  return path.join(home.licensesDir(), 'installation.id');
}

function getOrCreateInstallationId() {
  const fp = installationIdPath();
  try {
    if (fs.existsSync(fp)) {
      const id = String(fs.readFileSync(fp, 'utf8')).trim();
      if (id) return id;
    }
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    const id = uuidv4();
    fs.writeFileSync(fp, `${id}\n`, { mode: 0o640 });
    return id;
  } catch (e) {
    return process.env.LICENSE_INSTALLATION_ID || 'unknown';
  }
}

function loadPublicKeyPem() {
  const inline = String(process.env.LICENSE_PUBLIC_KEY || '').trim();
  if (inline.includes('BEGIN PUBLIC KEY')) {
    return inline.replace(/\\n/g, '\n');
  }
  const keyPath =
    String(process.env.LICENSE_PUBLIC_KEY_PATH || '').trim() ||
    path.join(home.licensesDir(), 'public.pem');
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  }
  const bundled = path.join(__dirname, '../../config/license-public.pem');
  if (fs.existsSync(bundled)) {
    return fs.readFileSync(bundled, 'utf8');
  }
  return null;
}

/**
 * Payload canónico para assinatura (ordem estável de chaves).
 * @param {object} doc
 */
function canonicalPayload(doc) {
  const copy = { ...doc };
  delete copy.signature;
  delete copy.signature_algorithm;
  const sorted = Object.keys(copy)
    .sort()
    .reduce((acc, k) => {
      acc[k] = copy[k];
      return acc;
    }, {});
  return JSON.stringify(sorted);
}

function verifySignature(doc, publicKeyPem) {
  if (!publicKeyPem) return { ok: false, reason: 'no_public_key' };
  const sig = String(doc.signature || '').trim();
  if (!sig) return { ok: false, reason: 'missing_signature' };
  try {
    const payload = canonicalPayload(doc);
    const verified = crypto.verify(
      null,
      Buffer.from(payload, 'utf8'),
      publicKeyPem,
      Buffer.from(sig, 'base64')
    );
    return verified ? { ok: true } : { ok: false, reason: 'invalid_signature' };
  } catch (e) {
    return { ok: false, reason: 'signature_verify_error', detail: e.message };
  }
}

function parseDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {object} doc — licença parseada
 * @param {object} [opts]
 */
function evaluateLicenseDocument(doc, opts = {}) {
  const installationId = opts.installationId || getOrCreateInstallationId();
  const publicKey = opts.publicKeyPem || loadPublicKeyPem();
  const now = opts.now ? new Date(opts.now) : new Date();
  const graceDays = opts.graceDays != null ? opts.graceDays : gracePeriodDays();

  const base = {
    mode: 'local',
    licenseId: doc.license_id || doc.id || null,
    installationId,
    companyId: doc.company_id || doc.companyId || null,
    companyName: doc.company_name || doc.companyName || null,
    plan: doc.plan || 'enterprise',
    issuedAt: doc.issued_at || doc.issuedAt || null,
    expiresAt: doc.expires_at || doc.expiresAt || null,
    maxUsers: doc.max_users ?? doc.maxUsers ?? null,
    minVersion: doc.min_version || doc.minVersion || null,
    capabilities: doc.capabilities || doc.resources || [],
  };

  const sig = verifySignature(doc, publicKey);
  if (!sig.ok) {
    return {
      ...base,
      valid: false,
      operational: false,
      state: 'invalid',
      reason: sig.reason,
      block: true,
    };
  }

  if (doc.installation_id && String(doc.installation_id) !== String(installationId)) {
    return {
      ...base,
      valid: false,
      operational: false,
      state: 'invalid',
      reason: 'installation_id_mismatch',
      block: true,
    };
  }

  if (opts.expectedCompanyId && doc.company_id && String(doc.company_id) !== String(opts.expectedCompanyId)) {
    return {
      ...base,
      valid: false,
      operational: false,
      state: 'invalid',
      reason: 'company_id_mismatch',
      block: true,
    };
  }

  const expires = parseDate(base.expiresAt);
  const capsSet = normalizeCapabilities(base.capabilities);
  const capabilities = [...capsSet];

  if (!expires) {
    return {
      ...base,
      valid: true,
      operational: true,
      state: 'valid',
      reason: 'ok',
      block: false,
      capabilities,
      capabilitiesSet: capsSet,
    };
  }

  if (now <= expires) {
    const daysLeft = Math.ceil((expires - now) / (86400000));
    return {
      ...base,
      valid: true,
      operational: true,
      state: daysLeft <= 30 ? 'expiring_soon' : 'valid',
      reason: 'ok',
      block: false,
      daysUntilExpiry: daysLeft,
      capabilities,
      capabilitiesSet: capsSet,
    };
  }

  const graceEnds = new Date(expires.getTime() + graceDays * 86400000);
  if (now <= graceEnds) {
    return {
      ...base,
      valid: false,
      operational: true,
      state: 'grace',
      reason: 'expired_grace',
      block: false,
      graceEndsAt: graceEnds.toISOString(),
      capabilities,
      capabilitiesSet: capsSet,
    };
  }

  return {
    ...base,
    valid: false,
    operational: false,
    state: 'expired',
    reason: 'expired',
    block: true,
    graceEndsAt: graceEnds.toISOString(),
    capabilities,
    capabilitiesSet: capsSet,
  };
}

function readLicenseFile(filePath) {
  const fp = filePath || licenseFilePath();
  if (!fs.existsSync(fp)) {
    return { ok: false, reason: 'license_file_not_found', path: fp };
  }
  try {
    const raw = fs.readFileSync(fp, 'utf8');
    const doc = JSON.parse(raw);
    return { ok: true, doc, path: fp };
  } catch (e) {
    return { ok: false, reason: 'license_file_corrupt', path: fp, detail: e.message };
  }
}

function validateLocalLicense(opts = {}) {
  const read = readLicenseFile(opts.filePath);
  if (!read.ok) {
    return {
      valid: false,
      operational: false,
      state: 'missing',
      reason: read.reason,
      block: process.env.LICENSE_BLOCK_WHEN_MISSING === 'true',
      path: read.path,
      mode: 'local',
    };
  }
  const result = evaluateLicenseDocument(read.doc, opts);
  result.path = read.path;
  return result;
}

function hasLocalLicenseFile() {
  const fp = licenseFilePath();
  return fs.existsSync(fp);
}

module.exports = {
  licenseMode,
  licenseFilePath,
  installationIdPath,
  getOrCreateInstallationId,
  loadPublicKeyPem,
  canonicalPayload,
  verifySignature,
  evaluateLicenseDocument,
  readLicenseFile,
  validateLocalLicense,
  hasLocalLicenseFile,
  gracePeriodDays,
};
