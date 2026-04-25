'use strict';

/**
 * Criptografia em repouso — AES-256-GCM (Node.js crypto).
 *
 * Material de chave:
 * - Padrão: DATA_ENCRYPTION_KEY (base64, 32 bytes), key_source = "env".
 * - Com DATA_ENCRYPTION_KMS_PROVIDER=aws|gcp (ou legado AWS_KMS/GCP_KMS):
 *   key_source = "kms" nos metadados. Modo mock: sem DEK embrulhada, o material
 *   continua a ser DATA_ENCRYPTION_KEY. Modo real: DATA_ENCRYPTION_KMS_ENCRYPTED_DEK
 *   + chamada KMS (ver docs); falha KMS → fallback para DATA_ENCRYPTION_KEY.
 *
 * Categoria SENSITIVE sem chave: persistência de novos traces **bloqueada** (ver
 * {@link assertAtRestPersistenceAllowed}); leitura de dados legados inalterada.
 */

const crypto = require('crypto');
const { normalizeKmsProvider } = require('./kms/kmsProviderNormalize');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const MAX_PLAINTEXT_BYTES = Math.min(
  2 * 1024 * 1024,
  Math.max(65536, parseInt(process.env.DATA_ENCRYPTION_MAX_PLAINTEXT_BYTES || '524288', 10))
);

/** Esquema do envelope e versão lógica da chave (rotação futura via KMS). */
const ENCRYPTION_VERSION = 'v1';

/** Código em Error.code quando persistência com primary_category SENSITIVE é rejeitada. */
const ERR_SENSITIVE_PERSISTENCE_NO_KEY = 'SENSITIVE_DATA_ENCRYPTION_REQUIRED';

/**
 * @typedef {object} EncryptionKeyBundle
 * @property {Buffer|null} key — material AES-256; não registar em logs.
 * @property {'env'|'kms'} key_source
 * @property {string} key_version
 */

/** @type {EncryptionKeyBundle|undefined} */
let _cachedBundle = undefined;

function getKmsProviderHint() {
  const p = process.env.DATA_ENCRYPTION_KMS_PROVIDER;
  return p != null && String(p).trim() !== '' ? String(p).trim() : null;
}

/**
 * Lê e valida DATA_ENCRYPTION_KEY sem cache (uso interno + validação startup).
 * @returns {Buffer|null}
 */
function parseEnvKeyMaterial() {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (raw == null || String(raw).trim() === '') {
    return null;
  }
  try {
    const buf = Buffer.from(String(raw).trim(), 'base64');
    if (buf.length !== KEY_LENGTH) {
      return null;
    }
    return buf;
  } catch {
    return null;
  }
}

function validateConfigurationOnce() {
  if (globalThis.__impetusEncryptionConfigChecked) return;
  globalThis.__impetusEncryptionConfigChecked = true;
  if (process.env.DATA_ENCRYPTION_KEY && !parseEnvKeyMaterial()) {
    console.error(
      '[ENCRYPTION] DATA_ENCRYPTION_KEY definida mas inválida (use base64 de exatamente 32 bytes). Criptografia em repouso desativada.'
    );
  }
}

/**
 * Resolve o material de cifra e metadados de origem.
 * @returns {EncryptionKeyBundle}
 */
function getEncryptionKey() {
  validateConfigurationOnce();
  if (_cachedBundle !== undefined) {
    return _cachedBundle;
  }

  const key = parseEnvKeyMaterial();
  const kms = getKmsProviderHint();

  if (kms) {
    _cachedBundle = {
      key,
      key_source: 'kms',
      key_version: ENCRYPTION_VERSION
    };
  } else {
    _cachedBundle = {
      key,
      key_source: 'env',
      key_version: ENCRYPTION_VERSION
    };
  }
  return _cachedBundle;
}

/**
 * Metadados seguros para persistência (sem expor o buffer da chave).
 * @returns {{ key_source: 'env'|'kms', key_version: string }}
 */
function getEncryptionKeyMeta() {
  const b = getEncryptionKey();
  return { key_source: b.key_source, key_version: b.key_version };
}

function hasKmsWrappedDekConfigured() {
  const v = process.env.DATA_ENCRYPTION_KMS_ENCRYPTED_DEK;
  return v != null && String(v).trim() !== '';
}

function isKmsBootstrapGenerateEnabled() {
  const v = process.env.DATA_ENCRYPTION_KMS_BOOTSTRAP_GENERATE;
  return v === '1' || String(v || '').toLowerCase() === 'true';
}

/**
 * Integração opcional AWS KMS (@aws-sdk/client-kms) / GCP Cloud KMS (@google-cloud/kms).
 *
 * - Sem provider normalizado ou sem DEK embrulhada / bootstrap: equivale ao mock
 *   (retorna {@link getEncryptionKey}).
 * - Com `DATA_ENCRYPTION_KMS_ENCRYPTED_DEK` (+ IAM / ADC): obtém plaintext via Decrypt.
 * - AWS bootstrap (só laboratório): `DATA_ENCRYPTION_KMS_BOOTSTRAP_GENERATE=true` + KEY_ID → GenerateDataKey.
 * - GCP bootstrap (só laboratório): gera plaintext aleatório, encrypt+decrypt na mesma chave.
 *
 * Em qualquer falha de KMS com `DATA_ENCRYPTION_KEY` válida: fallback para env (`key_source: env`,
 * flag `kms_fallback_from_env` no bundle).
 *
 * @returns {Promise<EncryptionKeyBundle & { kms_fallback_from_env?: boolean }>}
 */
async function fetchKeyFromKMS() {
  validateConfigurationOnce();
  const hint = getKmsProviderHint();
  const provider = normalizeKmsProvider(hint);

  if (!hint || !provider) {
    await Promise.resolve();
    return getEncryptionKey();
  }

  const hasWrapped = hasKmsWrappedDekConfigured();
  const bootstrap = isKmsBootstrapGenerateEnabled();

  if (!hasWrapped && !bootstrap) {
    await Promise.resolve();
    return getEncryptionKey();
  }

  try {
    let keyBuf;
    if (provider === 'aws') {
      const { fetchAwsKmsPlaintextKey } = require('./kms/awsKmsKeyMaterial');
      keyBuf = await fetchAwsKmsPlaintextKey({ hasWrapped, bootstrap });
    } else {
      const { fetchGcpKmsPlaintextKey } = require('./kms/gcpKmsKeyMaterial');
      keyBuf = await fetchGcpKmsPlaintextKey({ hasWrapped, bootstrap });
    }
    if (!keyBuf || keyBuf.length !== KEY_LENGTH) {
      throw new Error('KMS_KEY_LENGTH_INVALID');
    }
    return {
      key: keyBuf,
      key_source: 'kms',
      key_version: ENCRYPTION_VERSION
    };
  } catch (e) {
    console.warn(
      '[ENCRYPTION_KMS] Falha ao obter chave via KMS; a usar fallback DATA_ENCRYPTION_KEY se existir.',
      e && (e.code || e.name || e.message)
    );
    const envKey = parseEnvKeyMaterial();
    if (!envKey) {
      await Promise.resolve();
      return getEncryptionKey();
    }
    return {
      key: envKey,
      key_source: 'env',
      key_version: ENCRYPTION_VERSION,
      kms_fallback_from_env: true
    };
  }
}

/**
 * Opcional: após `await warmKmsEncryptionKey()`, a cache interna usa o material
 * devolvido por {@link fetchKeyFromKMS} (KMS real ou fallback env). Chamar no
 * arranque do processo **antes** de aceitar tráfego que cifra dados, quando usar
 * modo KMS real. Não está ligado ao `server.js` por defeito (ver documentação).
 *
 * @returns {Promise<{ ok: boolean, key_source?: string, kms_fallback_from_env?: boolean, reason?: string }>}
 */
async function warmKmsEncryptionKey() {
  validateConfigurationOnce();
  const bundle = await fetchKeyFromKMS();
  if (!bundle.key) {
    return { ok: false, reason: 'no_key_material' };
  }
  _cachedBundle = {
    key: bundle.key,
    key_source: bundle.key_source,
    key_version: bundle.key_version
  };
  return {
    ok: true,
    key_source: bundle.key_source,
    kms_fallback_from_env: bundle.kms_fallback_from_env === true
  };
}

function loadKeyBuffer() {
  return getEncryptionKey().key;
}

/**
 * Criptografia disponível e chave válida carregada.
 */
function isEncryptionAvailable() {
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
      hint: 'DATA_ENCRYPTION_KEY missing or invalid on this node (or KMS mock without key)'
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
      hint: 'verify_DATA_ENCRYPTION_KEY_or_KMS'
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

/**
 * `data_classification.primary_category === "SENSITIVE"` (comparação case-insensitive).
 * @param {object|null|undefined} classification
 * @returns {boolean}
 */
function isSensitivePrimaryCategory(classification) {
  if (!classification || typeof classification !== 'object') return false;
  return String(classification.primary_category || '').toUpperCase() === 'SENSITIVE';
}

/**
 * Regista evento de segurança (nunca inclui payload ou PII).
 * @param {string} event
 * @param {Record<string, unknown>} [detail]
 */
function logSecurityWarning(event, detail = {}) {
  console.warn(
    JSON.stringify({
      level: 'SECURITY_WARNING',
      event,
      source: 'impetus_encryption_at_rest',
      ts: new Date().toISOString(),
      ...detail
    })
  );
}

/**
 * Evita persistir traces classificados como SENSITIVE sem material de cifra.
 * Dados antigos (plain ou envelope) continuam a ser lidos via {@link tryDecryptValue} / {@link decryptField}.
 * @param {object|null|undefined} classification — p.ex. data_classification do trace
 * @param {object|null} [_policyRules] reservado (coerente com shouldEncryptAtRest)
 * @param {object|null} [_recordHints] reservado
 * @returns {void}
 * @throws {Error} code {@link ERR_SENSITIVE_PERSISTENCE_NO_KEY} quando SENSITIVE e `!`{@link isEncryptionAvailable}
 */
function assertAtRestPersistenceAllowed(classification, _policyRules, _recordHints) {
  if (isEncryptionAvailable()) return;
  if (!isSensitivePrimaryCategory(classification)) return;
  logSecurityWarning('SENSITIVE_PERSISTENCE_BLOCKED', {
    reason: 'no_encryption_key',
    hint: 'defina_DATA_ENCRYPTION_KEY_ou_kms',
    primary_category: 'SENSITIVE'
  });
  const err = new Error(
    `${ERR_SENSITIVE_PERSISTENCE_NO_KEY}: classificação SENSITIVE exige cifra em repouso (DATA_ENCRYPTION_KEY / KMS).`
  );
  err.code = ERR_SENSITIVE_PERSISTENCE_NO_KEY;
  throw err;
}

function getStatusMeta() {
  validateConfigurationOnce();
  const bundle = getEncryptionKey();
  const hint = getKmsProviderHint();
  const kmsNormalized = normalizeKmsProvider(hint);
  const keyIdSet = !!(process.env.DATA_ENCRYPTION_KMS_KEY_ID && String(process.env.DATA_ENCRYPTION_KMS_KEY_ID).trim());
  return {
    algorithm: ALGORITHM,
    encryption_version: ENCRYPTION_VERSION,
    key_source: bundle.key_source,
    encryption_key_source: bundle.key_source,
    encryption_key_version: bundle.key_version,
    kms_provider: hint,
    /** @deprecated use kms_provider */
    kms_provider_hint: hint,
    kms_provider_normalized: kmsNormalized,
    kms_key_id_configured: keyIdSet,
    kms_wrapped_dek_configured: hasKmsWrappedDekConfigured(),
    kms_bootstrap_generate_enabled: isKmsBootstrapGenerateEnabled(),
    kms_real_api_eligible: !!(kmsNormalized && (hasKmsWrappedDekConfigured() || isKmsBootstrapGenerateEnabled())),
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
  ERR_SENSITIVE_PERSISTENCE_NO_KEY,
  isSensitivePrimaryCategory,
  assertAtRestPersistenceAllowed,
  isEncryptionAvailable,
  isEncrypted,
  encryptField,
  decryptField,
  tryDecryptValue,
  shouldEncryptAtRest,
  getEncryptionKey,
  getEncryptionKeyMeta,
  fetchKeyFromKMS,
  warmKmsEncryptionKey,
  getStatusMeta,
  getAtRestCoverageStats,
  /** @internal test */
  _resetKeyCacheForTests() {
    _cachedBundle = undefined;
    delete globalThis.__impetusEncryptionConfigChecked;
  }
};
