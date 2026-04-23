'use strict';

/**
 * Camada de criptografia em repouso — AES-256-GCM (Node.js crypto).
 * Chave apenas via DATA_ENCRYPTION_KEY (base64, 32 bytes). Sem chave válida: modo desativado (sem quebrar fluxo).
 * Extensível para KMS: defina DATA_ENCRYPTION_KMS_PROVIDER (ex.: AWS_KMS) quando integrar.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const MAX_PLAINTEXT_BYTES = Math.min(
  2 * 1024 * 1024,
  Math.max(65536, parseInt(process.env.DATA_ENCRYPTION_MAX_PLAINTEXT_BYTES || '524288', 10))
);

const ENCRYPTION_VERSION = 'v1';

/** @type {Buffer|null} */
let _cachedKey = undefined;

function getKmsProviderHint() {
  const p = process.env.DATA_ENCRYPTION_KMS_PROVIDER;
  return p != null && String(p).trim() !== '' ? String(p).trim() : null;
}

function loadKeyBuffer() {
  if (_cachedKey !== undefined) return _cachedKey;
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (raw == null || String(raw).trim() === '') {
    _cachedKey = null;
    return null;
  }
  try {
    const buf = Buffer.from(String(raw).trim(), 'base64');
    if (buf.length !== KEY_LENGTH) {
      _cachedKey = null;
      return null;
    }
    _cachedKey = buf;
    return buf;
  } catch {
    _cachedKey = null;
    return null;
  }
}

function validateConfigurationOnce() {
  if (globalThis.__impetusEncryptionConfigChecked) return;
  globalThis.__impetusEncryptionConfigChecked = true;
  if (process.env.DATA_ENCRYPTION_KEY && !loadKeyBuffer()) {
    console.error(
      '[ENCRYPTION] DATA_ENCRYPTION_KEY definida mas inválida (use base64 de exatamente 32 bytes). Criptografia em repouso desativada.'
    );
  }
}

/**
 * Criptografia disponível e chave válida carregada.
 */
function isEncryptionAvailable() {
  validateConfigurationOnce();
  return loadKeyBuffer() !== null;
}

/**
 * Envelope persistido no JSONB.
 */
function isEncrypted(value) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
  return (
    value.encrypted === true &&
    value.algorithm === ALGORITHM &&
    typeof value.iv === 'string' &&
    typeof value.content === 'string' &&
    typeof value.auth_tag === 'string'
  );
}

/**
 * @param {string|Buffer|Record<string, unknown>} value
 * @returns {string|Buffer|Record<string, unknown>|null}
 */
function encryptField(value) {
  if (value == null) return value;
  validateConfigurationOnce();
  const key = loadKeyBuffer();
  if (!key) return value;
  if (isEncrypted(value)) return value;

  const plaintext =
    typeof value === 'string' || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(value);

  const ptBuf = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(String(plaintext), 'utf8');
  if (ptBuf.length > MAX_PLAINTEXT_BYTES) {
    throw new Error('DATA_ENCRYPTION_PLAINTEXT_TOO_LARGE');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const ciphertext = Buffer.concat([cipher.update(ptBuf), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: true,
    iv: iv.toString('base64'),
    content: ciphertext.toString('base64'),
    auth_tag: authTag.toString('base64'),
    algorithm: ALGORITHM
  };
}

/**
 * @param {unknown} payload — objeto envelope ou string JSON
 * @returns {unknown} texto/objeto original quando era JSON; string quando entrada era string
 */
function decryptField(payload) {
  validateConfigurationOnce();
  const key = loadKeyBuffer();
  if (!key) {
    throw new Error('DATA_ENCRYPTION_KEY_UNAVAILABLE');
  }

  let obj = payload;
  if (typeof payload === 'string') {
    try {
      obj = JSON.parse(payload);
    } catch {
      return payload;
    }
  }

  if (!isEncrypted(obj)) {
    return payload;
  }

  const iv = Buffer.from(obj.iv, 'base64');
  const authTag = Buffer.from(obj.auth_tag, 'base64');
  const ciphertext = Buffer.from(obj.content, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const plainBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const asUtf8 = plainBuf.toString('utf8');

  try {
    return JSON.parse(asUtf8);
  } catch {
    return asUtf8;
  }
}

/**
 * Tenta descriptografar; se não for envelope ou falhar, devolve valor original (compatibilidade).
 * @param {unknown} payload
 * @param {{ muteErrors?: boolean }} [opts]
 */
function tryDecryptValue(payload, opts = {}) {
  if (payload == null) return payload;

  let obj = payload;
  if (typeof payload === 'string') {
    try {
      obj = JSON.parse(payload);
    } catch {
      return payload;
    }
  }

  if (!isEncrypted(obj)) {
    return typeof payload === 'string' ? payload : obj;
  }

  if (!isEncryptionAvailable()) {
    return {
      _encryption_error: true,
      code: 'KEY_UNAVAILABLE',
      hint: 'DATA_ENCRYPTION_KEY missing or invalid on this node'
    };
  }

  try {
    return decryptField(obj);
  } catch (e) {
    if (!opts.muteErrors) {
      console.warn('[ENCRYPTION_DECRYPT]', e.code || e.message || 'failed');
    }
    return {
      _encryption_error: true,
      code: 'DECRYPT_FAILED',
      hint: 'verify_DATA_ENCRYPTION_KEY'
    };
  }
}

/**
 * @param {object} classification — data_classification do trace
 * @param {object|null} [policyRules] — ex.: { force_encryption: true }
 * @param {object|null} [recordHints] — ex.: { force_encryption: true }
 */
function shouldEncryptAtRest(classification, policyRules, recordHints) {
  if (recordHints && recordHints.force_encryption === true) return true;
  if (policyRules && policyRules.force_encryption === true) return true;
  if (!classification || typeof classification !== 'object') return false;

  const pc = String(classification.primary_category || '').toUpperCase();
  if (pc === 'PERSONAL' || pc === 'SENSITIVE') return true;
  if (classification.contains_sensitive_data === true || classification.contains_personal_data === true) {
    return true;
  }
  const rl = String(classification.risk_level || '').toUpperCase();
  if (rl === 'HIGH' || rl === 'CRITICAL') return true;
  return false;
}

function getStatusMeta() {
  validateConfigurationOnce();
  return {
    algorithm: ALGORITHM,
    encryption_version: ENCRYPTION_VERSION,
    kms_provider_hint: getKmsProviderHint(),
    max_plaintext_bytes: MAX_PLAINTEXT_BYTES
  };
}

/**
 * Métricas agregadas para painel admin (janela deslizante; apenas contagens).
 */
async function getAtRestCoverageStats() {
  const db = require('../db');
  try {
    const r = await db.query(
      `
      SELECT
        count(*)::int AS total_recent,
        count(*) FILTER (WHERE
          (COALESCE(input_payload->>'encrypted', '') = 'true' AND input_payload->>'algorithm' = $1)
          OR (COALESCE(output_response->>'encrypted', '') = 'true' AND output_response->>'algorithm' = $1)
        )::int AS rows_encrypted
      FROM ai_interaction_traces
      WHERE created_at >= now() - interval '365 days'
      `,
      [ALGORITHM]
    );
    const total = r.rows[0]?.total_recent || 0;
    const enc = r.rows[0]?.rows_encrypted || 0;
    return {
      encryption_enabled: isEncryptionAvailable(),
      encrypted_records_estimate: enc,
      coverage_percentage: total > 0 ? Math.round((enc / total) * 1000) / 10 : 0,
      window_days: 365,
      meta: getStatusMeta()
    };
  } catch {
    return {
      encryption_enabled: isEncryptionAvailable(),
      encrypted_records_estimate: null,
      coverage_percentage: null,
      window_days: 365,
      note: 'Métricas indisponíveis (schema ou conexão).',
      meta: getStatusMeta()
    };
  }
}

module.exports = {
  ALGORITHM,
  ENCRYPTION_VERSION,
  MAX_PLAINTEXT_BYTES,
  isEncryptionAvailable,
  isEncrypted,
  encryptField,
  decryptField,
  tryDecryptValue,
  shouldEncryptAtRest,
  getStatusMeta,
  getAtRestCoverageStats,
  /** @internal test */
  _resetKeyCacheForTests() {
    _cachedKey = undefined;
    delete globalThis.__impetusEncryptionConfigChecked;
  }
};
