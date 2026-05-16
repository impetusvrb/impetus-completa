'use strict';

/**
 * Middleware — Internal Network Governance (CIDR / anti-spoof).
 * Complementa requireInternalAccess; executar APÓS requireAuth quando auth necessário,
 * ou ANTES de auth para bloquear origem de rede cedo (recomendado: antes de auth).
 */

const governance = require('../services/internalNetworkGovernance');

const INTERNAL_ROUTE_REGISTRY = Object.freeze([
  { path: '/api/internal/sales', label: 'sales' },
  { path: '/api/internal/unified-metrics', label: 'unified-metrics' },
  { path: '/api/internal/unified-health', label: 'unified-health' },
  { path: '/api/internal/vector-health', label: 'vector-health' },
  { path: '/api/internal/test-environmental-cognitive', label: 'env-cognitive-test' },
  { path: '/api/internal/enterprise', label: 'enterprise' },
  { path: '/api/internal/operational-runtime', label: 'operational-runtime' },
  { path: '/api/internal/shadow-routes', label: 'shadow-routes' },
  { path: '/api/internal/governance', label: 'governance' }
]);

function logNetworkEvent(event, req, evaluation, extra = {}) {
  try {
    const payload = {
      event,
      route: req.originalUrl || req.path,
      method: req.method,
      ip: evaluation.network?.ip || null,
      ip_source: evaluation.network?.source || null,
      socket_ip: evaluation.network?.socketIp || null,
      proxy_trusted: evaluation.network?.proxyTrusted ?? null,
      spoof_risk: evaluation.network?.spoofRisk ?? false,
      matched_cidr: evaluation.matchedCidr || null,
      reason: evaluation.reason || null,
      user_id: req.user?.id || null,
      company_id: req.user?.company_id || null,
      tenant: req.user?.company_id || null,
      role: req.user?.role || null,
      label: extra.label || null,
      at: new Date().toISOString(),
      ...extra
    };
    console.info(`[${event}]`, JSON.stringify(payload));
  } catch (_e) {
    /* never break */
  }
}

function isDevBypass() {
  const env = String(process.env.NODE_ENV || '').toLowerCase();
  if (env === 'production') return false;
  return String(process.env.IMPETUS_INTERNAL_NETWORK_DEV_BYPASS || 'true').toLowerCase() !== 'false';
}

/**
 * @param {{ label?: string, skipInDev?: boolean }} [opts]
 */
function requireInternalNetworkAccess(opts = {}) {
  const label = String(opts.label || 'internal');

  return function internalNetworkGuard(req, res, next) {
    if (isDevBypass() && opts.skipInDev !== false) {
      logNetworkEvent('INTERNAL_ROUTE_ALLOWED', req, {
        reason: 'DEV_BYPASS',
        network: governance.resolveClientNetwork(req)
      }, { label });
      return next();
    }

    const evaluation = governance.evaluateNetworkAccess(req);

    if (evaluation.network?.spoofRisk) {
      logNetworkEvent('INTERNAL_ROUTE_PROXY_MISMATCH', req, evaluation, { label });
      return res.status(403).json({
        ok: false,
        code: evaluation.code || 'INTERNAL_ROUTE_PROXY_MISMATCH',
        error: 'Forwarded client IP not trusted; direct connection required for internal routes.'
      });
    }

    if (!evaluation.allowed) {
      logNetworkEvent('INTERNAL_ROUTE_BLOCKED', req, evaluation, { label });
      return res.status(403).json({
        ok: false,
        code: evaluation.code || 'INTERNAL_ROUTE_NETWORK_DENIED',
        error: 'Network origin not allowed for internal route.',
        reason: evaluation.reason
      });
    }

    if (evaluation.reason === 'CIDR_MATCH') {
      logNetworkEvent('INTERNAL_ROUTE_CIDR_MATCH', req, evaluation, { label });
    }
    logNetworkEvent('INTERNAL_ROUTE_ALLOWED', req, evaluation, { label });
    req._internalNetworkEvaluation = evaluation;
    return next();
  };
}

function getInternalRouteRegistry() {
  return INTERNAL_ROUTE_REGISTRY;
}

module.exports = {
  requireInternalNetworkAccess,
  getInternalRouteRegistry,
  INTERNAL_ROUTE_REGISTRY
};
