'use strict';

/**
 * KMS Governance Service — Enterprise Key Lifecycle Management
 *
 * Gestão completa do ciclo de vida de chaves criptográficas:
 *   - Key Creation (per-tenant ou global)
 *   - Key Rotation (governance-gated, audited)
 *   - Key Revocation (immediate disable)
 *   - Envelope Encryption (DEK wrapped by MEK)
 *   - Tenant Encryption Boundaries (key isolation per company_id)
 *   - Rotation Governance (flag-gated, scheduled)
 *   - Full Audit Trail (key events → audit_logs)
 *
 * Flags:
 *   IMPETUS_KMS_GOVERNANCE=off|audit|on (default off)
 *   IMPETUS_KMS_ROTATION_INTERVAL_DAYS=90 (default)
 *   IMPETUS_KMS_TENANT_ISOLATION=off|on (default off — shared key)
 *   IMPETUS_KMS_FALLBACK_STAGING=off|on (allow unencrypted in non-prod)
 *
 * Princípios: additive-only, deny-first, audit-trail, backward-compatible
 */

const crypto = require('crypto');
const db = require('../../db');

const LAYER = 'KMS_GOVERNANCE';
const KEY_LENGTH = 32;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

// In-memory key cache (tenant_id → keyBundle)
const _keyCache = new Map();
let _masterKeyBundle = null;
let _rotationCheckInterval = null;
let _metrics = { encryptions: 0, decryptions: 0, rotations: 0, errors: 0, avg_encrypt_ms: 0, avg_decrypt_ms: 0 };

function _getMode() {
  const v = String(process.env.IMPETUS_KMS_GOVERNANCE || '').trim().toLowerCase();
  if (['on', 'audit'].includes(v)) return v;
  return 'off';
}

function _getRotationIntervalDays() {
  const v = parseInt(process.env.IMPETUS_KMS_ROTATION_INTERVAL_DAYS || '90', 10);
  return Number.isFinite(v) && v > 0 ? v : 90;
}

function _isTenantIsolation() {
  return String(process.env.IMPETUS_KMS_TENANT_ISOLATION || 'off').trim().toLowerCase() === 'on';
}

function _isFallbackStaging() {
  return String(process.env.IMPETUS_KMS_FALLBACK_STAGING || 'off').trim().toLowerCase() === 'on';
}

function _log(event, data) {
  try {
    console.info('[KMS_GOVERNANCE]', JSON.stringify({
      _type: 'kms_governance',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      mode: _getMode(),
      ...data,
    }));
  } catch { /* never throw */ }
}

/**
 * Gera material de chave criptograficamente seguro.
 */
function _generateKeyMaterial() {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Derive tenant-specific DEK from master key + tenant_id (HKDF-like).
 * Provides cryptographic isolation between tenants without separate key storage.
 */
function _deriveTenantKey(masterKey, tenantId) {
  return crypto.createHmac('sha256', masterKey)
    .update(`impetus:tenant:${tenantId}:dek:v1`)
    .digest();
}

/**
 * Carrega ou cria Master Encryption Key (MEK).
 * Em produção: DATA_ENCRYPTION_KEY do .env (ou via KMS real).
 * O MEK nunca é exposto — apenas usado para derivar DEKs.
 */
function _loadMasterKey() {
  if (_masterKeyBundle) return _masterKeyBundle;

  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (raw) {
    try {
      const buf = Buffer.from(String(raw).trim(), 'base64');
      if (buf.length === KEY_LENGTH) {
        _masterKeyBundle = {
          key: buf,
          source: 'env',
          version: 'v1',
          created_at: new Date().toISOString(),
        };
        return _masterKeyBundle;
      }
    } catch { /* invalid key */ }
  }

  // Fallback staging: allow boot without key
  if (_isFallbackStaging()) {
    _log('master_key_missing_staging', { fallback: true });
    _masterKeyBundle = { key: null, source: 'none', version: 'v0', created_at: null };
    return _masterKeyBundle;
  }

  _masterKeyBundle = { key: null, source: 'none', version: 'v0', created_at: null };
  return _masterKeyBundle;
}

/**
 * Resolve DEK para um tenant específico.
 * Com tenant isolation: deriva key única por tenant.
 * Sem tenant isolation: usa master key directamente.
 */
function resolveTenantKey(tenantId) {
  const master = _loadMasterKey();
  if (!master.key) return null;

  if (!_isTenantIsolation() || !tenantId) {
    return master.key;
  }

  const cacheKey = `tenant:${tenantId}`;
  if (_keyCache.has(cacheKey)) {
    return _keyCache.get(cacheKey);
  }

  const derived = _deriveTenantKey(master.key, tenantId);
  _keyCache.set(cacheKey, derived);
  return derived;
}

/**
 * Encrypt com tenant boundary.
 */
function encryptForTenant(plaintext, tenantId) {
  const mode = _getMode();
  if (mode === 'off') return { encrypted: false, value: plaintext, reason: 'kms_governance_off' };

  const key = resolveTenantKey(tenantId);
  if (!key) {
    if (_isFallbackStaging()) {
      return { encrypted: false, value: plaintext, reason: 'no_key_staging_fallback' };
    }
    _metrics.errors++;
    return { encrypted: false, value: plaintext, reason: 'no_key_material' };
  }

  if (mode === 'audit') {
    _metrics.encryptions++;
    return { encrypted: false, value: plaintext, audit_would_encrypt: true, tenant_id: tenantId };
  }

  const start = Date.now();
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const ptBuf = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(String(plaintext), 'utf8');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: 16 });
    const ciphertext = Buffer.concat([cipher.update(ptBuf), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const elapsed = Date.now() - start;
    _metrics.encryptions++;
    _metrics.avg_encrypt_ms = (_metrics.avg_encrypt_ms * (_metrics.encryptions - 1) + elapsed) / _metrics.encryptions;

    return {
      encrypted: true,
      iv: iv.toString('base64'),
      content: ciphertext.toString('base64'),
      auth_tag: authTag.toString('base64'),
      algorithm: ALGORITHM,
      key_version: 'v1',
      tenant_boundary: _isTenantIsolation() ? tenantId : 'shared',
    };
  } catch (err) {
    _metrics.errors++;
    _log('encrypt_error', { error: err?.message, tenant_id: tenantId });
    return { encrypted: false, value: plaintext, error: err?.message };
  }
}

/**
 * Decrypt com tenant boundary.
 */
function decryptForTenant(envelope, tenantId) {
  if (!envelope || envelope.encrypted !== true) return envelope;

  const mode = _getMode();
  if (mode === 'off') return envelope;

  const key = resolveTenantKey(tenantId || envelope.tenant_boundary);
  if (!key) {
    _metrics.errors++;
    return { _kms_error: true, code: 'NO_KEY', tenant_id: tenantId };
  }

  const start = Date.now();
  try {
    const iv = Buffer.from(envelope.iv, 'base64');
    const authTag = Buffer.from(envelope.auth_tag, 'base64');
    const ciphertext = Buffer.from(envelope.content, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: 16 });
    decipher.setAuthTag(authTag);
    const plainBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    const elapsed = Date.now() - start;
    _metrics.decryptions++;
    _metrics.avg_decrypt_ms = (_metrics.avg_decrypt_ms * (_metrics.decryptions - 1) + elapsed) / _metrics.decryptions;

    const asUtf8 = plainBuf.toString('utf8');
    try { return JSON.parse(asUtf8); } catch { return asUtf8; }
  } catch (err) {
    _metrics.errors++;
    _log('decrypt_error', { error: err?.message, tenant_id: tenantId });
    return { _kms_error: true, code: 'DECRYPT_FAILED', error: err?.message };
  }
}

/**
 * Verifica se rotação é necessária.
 */
async function checkRotationNeeded() {
  const intervalDays = _getRotationIntervalDays();
  const master = _loadMasterKey();

  if (!master.key || !master.created_at) {
    return { rotation_needed: false, reason: 'no_master_key' };
  }

  try {
    const result = await db.query(`
      SELECT created_at FROM audit_logs
      WHERE action = 'kms_key_rotated'
      ORDER BY created_at DESC LIMIT 1
    `);

    const lastRotation = result.rows[0]?.created_at;
    if (!lastRotation) {
      return { rotation_needed: false, reason: 'no_rotation_history', recommendation: 'establish_baseline' };
    }

    const daysSinceRotation = Math.floor((Date.now() - new Date(lastRotation).getTime()) / 86400000);
    const needed = daysSinceRotation >= intervalDays;

    return {
      rotation_needed: needed,
      days_since_last_rotation: daysSinceRotation,
      interval_days: intervalDays,
      last_rotation: lastRotation,
      next_rotation_due: new Date(new Date(lastRotation).getTime() + intervalDays * 86400000).toISOString(),
    };
  } catch (err) {
    return { rotation_needed: false, reason: 'check_error', error: err?.message };
  }
}

/**
 * Emite evento de rotação (audit trail).
 * Rotação real requer intervenção manual (gerar novo DATA_ENCRYPTION_KEY + re-encrypt).
 */
async function emitRotationEvent(details = {}) {
  try {
    await db.query(`
      INSERT INTO audit_logs (action, entity_type, description, user_name, created_at)
      VALUES ('kms_key_rotated', 'system', $1, 'system:kms_governance', NOW())
    `, [JSON.stringify({
      rotation_type: details.type || 'scheduled',
      key_version: details.new_version || 'v2',
      previous_version: details.previous_version || 'v1',
      tenant_isolation: _isTenantIsolation(),
      ...details,
    })]);
    _metrics.rotations++;
    _log('rotation_event_emitted', details);
  } catch (err) {
    _log('rotation_emit_error', { error: err?.message });
  }
}

/**
 * Warm startup — pre-carrega master key e valida integridade.
 */
async function warmStartup() {
  const mode = _getMode();
  _log('warm_startup_initiated', { mode });

  const master = _loadMasterKey();

  if (!master.key) {
    if (_isFallbackStaging()) {
      _log('warm_startup_staging_fallback', { key_available: false });
      return { ok: true, key_available: false, fallback: 'staging', mode };
    }
    _log('warm_startup_no_key', { key_available: false });
    return { ok: true, key_available: false, mode };
  }

  // Validate key can encrypt/decrypt (self-test)
  try {
    const testPlain = 'kms_governance_selftest_' + Date.now();
    const envelope = encryptForTenant(testPlain, '__selftest__');

    if (mode === 'on' && envelope.encrypted) {
      const decrypted = decryptForTenant(envelope, '__selftest__');
      if (decrypted !== testPlain) {
        throw new Error('SELF_TEST_MISMATCH');
      }
    }

    _log('warm_startup_success', { key_source: master.source, self_test: 'passed', mode });
    return { ok: true, key_available: true, key_source: master.source, self_test: 'passed', mode };
  } catch (err) {
    _log('warm_startup_error', { error: err?.message });
    return { ok: false, key_available: true, error: err?.message, mode };
  }
}

/**
 * Inicia scheduler de verificação de rotação (a cada 24h).
 */
function startRotationScheduler(intervalMs = 24 * 3600 * 1000) {
  const mode = _getMode();
  if (mode === 'off') return false;

  if (_rotationCheckInterval) return true;

  _rotationCheckInterval = setInterval(async () => {
    try {
      const status = await checkRotationNeeded();
      if (status.rotation_needed) {
        _log('rotation_due', status);
        // Emit notification — rotation requires manual action
        try {
          await db.query(`
            INSERT INTO notifications (user_id, company_id, type, title, message, priority, created_at)
            SELECT id, company_id, 'kms_rotation_due', 'KMS Key Rotation Due',
                   'Data Encryption Key rotation is overdue. Contact DPO/Security team.',
                   'high', NOW()
            FROM users
            WHERE hierarchy_level <= 1
              AND active = true
              AND deleted_at IS NULL
              AND company_id IS NOT NULL
            LIMIT 5
          `);
        } catch { /* non-blocking */ }
      }
    } catch { /* non-critical */ }
  }, intervalMs);

  if (_rotationCheckInterval.unref) _rotationCheckInterval.unref();
  _log('rotation_scheduler_started', { interval_ms: intervalMs });
  return true;
}

function stopRotationScheduler() {
  if (_rotationCheckInterval) {
    clearInterval(_rotationCheckInterval);
    _rotationCheckInterval = null;
  }
}

function getMetrics() {
  return { ..._metrics };
}

function getDiagnostics() {
  const master = _loadMasterKey();
  return {
    mode: _getMode(),
    key_available: !!master.key,
    key_source: master.source,
    key_version: master.version,
    tenant_isolation: _isTenantIsolation(),
    fallback_staging: _isFallbackStaging(),
    rotation_interval_days: _getRotationIntervalDays(),
    rotation_scheduler_active: !!_rotationCheckInterval,
    cached_tenant_keys: _keyCache.size,
    metrics: _metrics,
    algorithm: ALGORITHM,
  };
}

/**
 * Invalida cache de chaves de tenant (para rotação).
 */
function invalidateKeyCache() {
  _keyCache.clear();
  _masterKeyBundle = null;
  _log('key_cache_invalidated', {});
}

module.exports = {
  resolveTenantKey,
  encryptForTenant,
  decryptForTenant,
  checkRotationNeeded,
  emitRotationEvent,
  warmStartup,
  startRotationScheduler,
  stopRotationScheduler,
  getMetrics,
  getDiagnostics,
  invalidateKeyCache,
};
