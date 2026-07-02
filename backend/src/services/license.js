/**
 * SERVIÇO DE VALIDAÇÃO DE LICENÇA
 * SaaS: validação remota (LICENSE_SERVER_URL + LICENSE_KEY)
 * Enterprise: ficheiro local assinado (IMPETUS_HOME/licenses/) — offline
 * CERT-LICENSE-01 · ADR-009
 */

const axios = require('axios');
const local = require('./license/enterpriseLicenseLocal');
const { recordValidation } = require('./license/licenseObservability');
const { normalizeCapabilities } = require('./license/licenseCapabilities');

const LICENSE_SERVER = process.env.LICENSE_SERVER_URL || '';
const LICENSE_API_KEY = process.env.LICENSE_API_KEY || '';
const VALIDATION_ENABLED = process.env.LICENSE_VALIDATION_ENABLED === 'true';
const CACHE_TTL_MS = parseInt(process.env.LICENSE_CACHE_TTL_MS, 10) || 60 * 60 * 1000;

let cache = { key: null, result: null, expiresAt: 0 };

async function validateWithServer(licenseKey) {
  if (!LICENSE_SERVER || !licenseKey) {
    return { valid: false, operational: false, reason: 'config_incomplete', mode: 'remote' };
  }
  try {
    const response = await axios.post(
      LICENSE_SERVER,
      { license_key: licenseKey },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LICENSE_API_KEY,
        },
      }
    );
    const data = response.data || {};
    const caps = normalizeCapabilities(data.features || data.capabilities || []);
    const result = {
      valid: data.valid === true,
      operational: data.valid === true,
      reason: data.valid ? 'ok' : 'remote_invalid',
      mode: 'remote',
      state: data.valid ? 'valid' : 'invalid',
      block: !data.valid,
      companyId: data.company_id,
      expiresAt: data.expires_at,
      plan: data.plan || 'essencial',
      capabilities: [...caps],
      capabilitiesSet: caps,
    };
    return result;
  } catch (err) {
    console.error('[LICENSE_VALIDATION_ERROR]', err.message);
    return {
      valid: false,
      operational: process.env.LICENSE_REMOTE_FAIL_OPEN === 'true',
      reason: 'server_unreachable',
      mode: 'remote',
      state: 'invalid',
      block: process.env.LICENSE_REMOTE_FAIL_OPEN !== 'true',
    };
  }
}

function getLicenseKey() {
  return process.env.LICENSE_KEY || process.env.IMPETUS_LICENSE_KEY || '';
}

function resolveValidationMode() {
  const mode = local.licenseMode();
  if (mode === 'local') return 'local';
  if (mode === 'remote') return 'remote';
  if (local.hasLocalLicenseFile()) return 'local';
  if (LICENSE_SERVER && getLicenseKey()) return 'remote';
  if (local.hasLocalLicenseFile()) return 'local';
  return 'none';
}

async function validateLicense(forceRefresh = false) {
  if (!VALIDATION_ENABLED) {
    const disabled = {
      valid: true,
      operational: true,
      reason: 'validation_disabled',
      state: 'disabled',
      block: false,
      mode: 'disabled',
    };
    return disabled;
  }

  const mode = resolveValidationMode();
  const cacheKey = mode === 'remote' ? getLicenseKey() : local.licenseFilePath();

  if (!forceRefresh && cache.key === cacheKey && Date.now() < cache.expiresAt && cache.result) {
    return cache.result;
  }

  let result;
  if (mode === 'local') {
    result = local.validateLocalLicense();
  } else if (mode === 'remote') {
    result = await validateWithServer(getLicenseKey());
  } else {
    result = {
      valid: false,
      operational: process.env.LICENSE_BLOCK_WHEN_MISSING !== 'true',
      reason: 'no_license_configured',
      state: 'missing',
      block: process.env.LICENSE_BLOCK_WHEN_MISSING === 'true',
      mode: 'none',
    };
  }

  recordValidation(result);
  cache = { key: cacheKey, result, expiresAt: Date.now() + CACHE_TTL_MS };
  return result;
}

function invalidateCache() {
  cache = { key: null, result: null, expiresAt: 0 };
}

function isValidationEnabled() {
  return VALIDATION_ENABLED;
}

function shouldBlockAccess(result) {
  if (!VALIDATION_ENABLED) return false;
  if (!result) return false;
  if (result.block === true) return true;
  if (result.operational === false && result.state !== 'grace') return true;
  return false;
}

module.exports = {
  validateLicense,
  invalidateCache,
  isValidationEnabled,
  getLicenseKey,
  shouldBlockAccess,
  resolveValidationMode,
  validateWithServer,
};
