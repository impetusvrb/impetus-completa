/**
 * SERVIÇO DE VALIDAÇÃO DE LICENÇA
 * Verifica chave de licença contra servidor central (API)
 * Bloqueia funcionalidades core se licença inválida ou expirada
 */

const axios = require('axios');

const LICENSE_SERVER = process.env.LICENSE_SERVER_URL || '';
const LICENSE_API_KEY = process.env.LICENSE_API_KEY || '';
const VALIDATION_ENABLED = process.env.LICENSE_VALIDATION_ENABLED === 'true';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora em memória

let cache = { key: null, result: null, expiresAt: 0 };

async function validateWithServer(licenseKey) {
  if (!LICENSE_SERVER || !licenseKey) {
    return { valid: false, reason: 'config_incomplete' };
  }
  try {
    const response = await axios.post(
      LICENSE_SERVER,
      { license_key: licenseKey },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LICENSE_API_KEY
        }
      }
    );
    const data = response.data || {};
    return {
      valid: data.valid === true,
      companyId: data.company_id,
      expiresAt: data.expires_at,
      plan: data.plan || 'essencial',
      features: data.features || []
    };
  } catch (err) {
    console.error('[LICENSE_VALIDATION_ERROR]', err.message);
    return { valid: false, reason: 'server_unreachable' };
  }
}

function getLicenseKey() {
  return process.env.LICENSE_KEY || process.env.IMPETUS_LICENSE_KEY || '';
}

async function validateLicense(forceRefresh = false) {
  if (!VALIDATION_ENABLED) {
    return { valid: true, reason: 'validation_disabled' };
  }
  const key = getLicenseKey();
  if (!key) {
    return { valid: false, reason: 'no_license_key' };
  }
  if (!forceRefresh && cache.key === key && Date.now() < cache.expiresAt) {
    return cache.result;
  }
  const result = await validateWithServer(key);
  cache = {
    key,
    result,
    expiresAt: Date.now() + CACHE_TTL_MS
  };
  return result;
}

function invalidateCache() {
  cache = { key: null, result: null, expiresAt: 0 };
}

function isValidationEnabled() {
  return VALIDATION_ENABLED;
}

module.exports = {
  validateLicense,
  invalidateCache,
  isValidationEnabled,
  getLicenseKey
};
