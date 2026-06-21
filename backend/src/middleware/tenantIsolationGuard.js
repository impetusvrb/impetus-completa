'use strict';

/**
 * Tenant Isolation Guard — camada de defesa em profundidade multi-tenant.
 *
 * Inserir globalmente APÓS requireAuth:
 *   app.use('/api', requireAuth, tenantIsolationGuard(), ...routes)
 *
 * Funcionalidades:
 *   1. Rejeita requests sem company_id no token (exceto rotas whitelist).
 *   2. Neutraliza company_id vindo de body/query/params — substitui pelo do token.
 *   3. Injeta req.tenantId para uso unificado nos handlers.
 *   4. Auditoria assíncrona de tentativas de tenant spoofing.
 */

const WHITELIST_PREFIXES = Object.freeze([
  '/api/auth/',
  '/api/register',
  '/api/webhooks/',
  '/api/webhook',
  '/health',
  '/api/health',
  '/api/system/health',
  '/api/anam/public-config',
  '/api/anam/session-token',
  '/api/anam/prepare',
]);

const ADMIN_PORTAL_PREFIXES = Object.freeze([
  '/api/admin-portal/',
  '/api/impetus-admin/',
]);

function isWhitelisted(path) {
  const p = String(path || '').split('?')[0].toLowerCase();
  return WHITELIST_PREFIXES.some((w) => p.startsWith(w));
}

function isAdminPortal(path) {
  const p = String(path || '').split('?')[0].toLowerCase();
  return ADMIN_PORTAL_PREFIXES.some((w) => p.startsWith(w));
}

function logSpoofAttempt(req, source, clientValue) {
  try {
    const payload = {
      event: 'TENANT_SPOOF_ATTEMPT',
      ip: req.ip,
      user_id: req.user?.id || null,
      user_email: req.user?.email || null,
      token_company_id: req.user?.company_id || null,
      spoofed_company_id: clientValue,
      source,
      path: req.originalUrl || req.url,
      method: req.method,
      at: new Date().toISOString(),
    };
    console.warn(`[TENANT_SPOOF]`, JSON.stringify(payload));
  } catch (_) { /* never break */ }
}

function sanitizeTenantFromInput(req) {
  const tokenCid = req.user?.company_id;
  const sources = [
    { key: 'body', obj: req.body },
    { key: 'query', obj: req.query },
    { key: 'params', obj: req.params },
  ];

  for (const { key, obj } of sources) {
    if (!obj || typeof obj !== 'object') continue;
    for (const field of ['company_id', 'companyId', 'tenant_id', 'tenantId']) {
      if (obj[field] !== undefined && obj[field] !== null) {
        const clientVal = String(obj[field]);
        if (tokenCid && clientVal !== String(tokenCid)) {
          logSpoofAttempt(req, `${key}.${field}`, clientVal);
        }
        if (tokenCid) {
          obj[field] = tokenCid;
        }
      }
    }
  }
}

/**
 * @param {{ strict?: boolean, auditLog?: boolean }} opts
 *   strict: rejeita 403 se company_id ausente (default true)
 *   auditLog: emite log de spoof (default true)
 */
function tenantIsolationGuard(opts = {}) {
  const strict = opts.strict !== false;
  const auditLog = opts.auditLog !== false;

  return function _tenantIsolationGuard(req, res, next) {
    const path = req.originalUrl || req.url || '';

    if (isWhitelisted(path)) return next();

    if (!req.user) return next();

    const cid = req.user.company_id;

    if (isAdminPortal(path) && req.user.role === 'impetus_admin') {
      req.tenantId = null;
      return next();
    }

    if (!cid && strict) {
      return res.status(403).json({
        ok: false,
        code: 'TENANT_MISSING',
        error: 'Sessão sem empresa vinculada. Faça login novamente.',
      });
    }

    req.tenantId = cid ? String(cid) : null;

    if (auditLog) {
      sanitizeTenantFromInput(req);
    }

    return next();
  };
}

module.exports = { tenantIsolationGuard, sanitizeTenantFromInput, isWhitelisted };
