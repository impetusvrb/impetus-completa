'use strict';

/**
 * Enforcement de licença — evolução do middleware arquivado (CERT-LICENSE-01).
 * Não altera RBAC/JWT; bloqueia apenas quando licença inválida pós-grace.
 */

const { validateLicense, shouldBlockAccess, isValidationEnabled } = require('../services/license');
const { getCapabilitiesPayload } = require('../services/license/licenseCapabilities');

const WHITELIST_PREFIXES = [
  '/api/auth',
  '/api/register',
  '/api/webhook',
  '/api/webhooks',
  '/api/health',
  '/health',
  '/api/system/health',
  '/api/system/license',
  '/api/system/frontend-build',
  '/api/anam/public-config',
  '/api/anam/session-token',
  '/api/anam/prepare',
];

let cachedResult = null;
let lastCheck = 0;
const CACHE_MS = parseInt(process.env.LICENSE_MIDDLEWARE_CACHE_MS, 10) || 5 * 60 * 1000;

function isWhitelisted(path) {
  const p = String(path || '').split('?')[0].toLowerCase();
  return WHITELIST_PREFIXES.some((w) => p === w || p.startsWith(`${w}/`));
}

async function requireValidLicense(req, res, next) {
  if (!isValidationEnabled()) return next();
  if (isWhitelisted(req.path)) return next();

  try {
    if (Date.now() - lastCheck < CACHE_MS && cachedResult) {
      if (shouldBlockAccess(cachedResult)) {
        return res.status(403).json({
          ok: false,
          error: 'Licença inválida ou expirada',
          code: 'LICENSE_INVALID',
          state: cachedResult.state,
          reason: cachedResult.reason,
        });
      }
      req.license = cachedResult;
      return next();
    }

    const result = await validateLicense();
    lastCheck = Date.now();
    cachedResult = result;

    if (shouldBlockAccess(result)) {
      return res.status(403).json({
        ok: false,
        error: 'Licença inválida ou expirada',
        code: 'LICENSE_INVALID',
        state: result.state,
        reason: result.reason,
      });
    }

    req.license = result;
    return next();
  } catch (e) {
    console.warn('[LICENSE_MIDDLEWARE]', e.message || e);
    return next();
  }
}

function licenseApiMiddleware(req, res, next) {
  if (!String(req.path || '').startsWith('/api')) return next();
  return requireValidLicense(req, res, next);
}

module.exports = {
  requireValidLicense,
  licenseApiMiddleware,
  isWhitelisted,
  getCapabilitiesPayload,
};
