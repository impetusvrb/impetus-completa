'use strict';

/**
 * IMPETUS — Internal Route Guard (Enterprise Hardening Bloco 1)
 *
 * Protege rotas internas (/api/internal/*, /api/system/health/deep) com:
 *   • requireAuth obrigatório
 *   • role/capability internal_admin (ou admin do tenant)
 *   • IP/CIDR: delegado a internalNetworkGuard + internalNetworkGovernance
 *   • feature flag global (IMPETUS_INTERNAL_ROUTES_ENABLED; default true mas
 *     pode ser desligado em produção para sealar surface; em produção sem flag
 *     explícita comporta-se como "habilitado" para não quebrar uptime do legado
 *     — apenas se o caller for autorizado).
 *   • payload mínimo / correlation IDs / log de acesso interno
 *
 * Aditivo e backward-compatible: routers existentes mantêm os seus handlers;
 * apenas ganham um filtro à frente.
 *
 * Em DEV (NODE_ENV !== 'production') o guard cai para "warn-only" se
 * IMPETUS_INTERNAL_ROUTES_DEV_OPEN === 'true', para não atrapalhar
 * desenvolvimento local. Default em DEV: continua a exigir auth.
 */

const path = require('path');

const FLAG_ENABLED_RAW = () =>
  String(process.env.IMPETUS_INTERNAL_ROUTES_ENABLED ?? '').trim().toLowerCase();

function isExplicitlyDisabled() {
  const v = FLAG_ENABLED_RAW();
  return v === 'false' || v === '0' || v === 'off' || v === 'no';
}

function isDevOpen() {
  const env = String(process.env.NODE_ENV || '').toLowerCase();
  const flag = String(process.env.IMPETUS_INTERNAL_ROUTES_DEV_OPEN || '').toLowerCase();
  return env !== 'production' && (flag === 'true' || flag === '1' || flag === 'yes');
}

function clientIp(req) {
  try {
    const governance = require('../services/internalNetworkGovernance');
    return governance.resolveClientNetwork(req).ip || '';
  } catch (_e) {
    const fwd = (req.get && req.get('x-forwarded-for')) || '';
    const first = String(fwd).split(',')[0].trim();
    return first || req.ip || (req.socket && req.socket.remoteAddress) || '';
  }
}

function userIsInternalAdmin(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'internal_admin' || role === 'impetus_admin' || role === 'admin_impetus') {
    return true;
  }
  // role 'admin' do tenant + capability system_administration: cai para true
  if (role === 'admin') return true;
  if (user.is_tenant_admin === true) return true;
  try {
    const contextualSystemAdmin = require('../services/contextualSystemAdminService');
    if (
      contextualSystemAdmin.isContextualSystemAdminGateEnabled() &&
      contextualSystemAdmin.userHasSystemAdministrationCapability(user)
    ) {
      return true;
    }
  } catch (_e) {
    /* deny */
  }
  return false;
}

function logInternalAccess(req, decision, extra = {}) {
  try {
    const payload = {
      event: 'INTERNAL_ROUTE_ACCESS',
      decision,
      path: req.originalUrl || req.path,
      method: req.method,
      ip: clientIp(req),
      user_id: req.user?.id || null,
      company_id: req.user?.company_id || null,
      role: req.user?.role || null,
      trace_id: req.headers['x-request-id'] || req.headers['x-ai-trace-id'] || null,
      at: new Date().toISOString(),
      ...extra
    };
    console.info('[INTERNAL_ROUTE_ACCESS]', JSON.stringify(payload));
  } catch (_e) {
    /* never break */
  }
}

/**
 * Express middleware factory.
 * @param {{ requireInternalAdmin?: boolean, label?: string }} [opts]
 */
function requireInternalAccess(opts = {}) {
  const label = String(opts.label || 'internal');
  const requireAdmin = opts.requireInternalAdmin !== false; // default true

  return function internalGuard(req, res, next) {
    // 1) Feature flag global — só bloqueia se EXPLICITAMENTE desligada.
    if (isExplicitlyDisabled()) {
      logInternalAccess(req, 'denied_flag_off', { label });
      return res.status(503).json({
        ok: false,
        error: 'Internal routes disabled by feature flag (IMPETUS_INTERNAL_ROUTES_ENABLED=false).',
        code: 'INTERNAL_ROUTES_DISABLED'
      });
    }

    // 2) DEV open mode (apenas fora de produção e explícito) — segue sem auth, mas loga.
    if (isDevOpen()) {
      logInternalAccess(req, 'allowed_dev_open', { label });
      return next();
    }

    // 3) IP/CIDR — internalNetworkGuard (montado em server.js antes deste middleware).

    // 4) Auth obrigatória — delegamos a requireAuth para preencher req.user.
    if (!req.user) {
      logInternalAccess(req, 'denied_anonymous', { label });
      return res.status(401).json({
        ok: false,
        error: 'Authentication required for internal route.',
        code: 'AUTH_REQUIRED'
      });
    }

    // 5) Role/capability — exige internal_admin (default).
    if (requireAdmin && !userIsInternalAdmin(req.user)) {
      logInternalAccess(req, 'denied_role', { label });
      return res.status(403).json({
        ok: false,
        error: 'Role required for internal route.',
        code: 'INTERNAL_ROLE_DENIED'
      });
    }

    // 6) Correlation ID — propagar para handlers + resposta.
    const corr =
      req.headers['x-request-id'] ||
      req.headers['x-ai-trace-id'] ||
      `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    req._internalCorrelationId = corr;
    try {
      res.setHeader('X-Request-Id', corr);
    } catch (_e) {
      /* ignore */
    }

    logInternalAccess(req, 'allowed', { label, corr });
    return next();
  };
}

module.exports = {
  requireInternalAccess,
  userIsInternalAdmin,
  __internal: { isExplicitlyDisabled, isDevOpen, clientIp }
};
