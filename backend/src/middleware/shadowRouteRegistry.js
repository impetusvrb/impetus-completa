'use strict';

/**
 * Registry governado de rotas shadow/internal de teste.
 * Produção: deny-by-default quando flags OFF ou IMPETUS_SHADOW_ROUTES_ENABLED=false.
 */

const REGISTRY = Object.freeze([
  {
    id: 'env-cognitive-test',
    method: 'POST',
    path: '/api/internal/test-environmental-cognitive',
    envFlag: 'IMPETUS_ENVIRONMENTAL_COGNITIVE_SHADOW',
    productionAllowed: false,
    expiresAfter: null,
    description: 'Shadow cognitive test — structured_input environmental'
  }
]);

const _auditBuffer = [];
const MAX_AUDIT = 200;

function isProduction() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function shadowRoutesGloballyEnabled() {
  const v = String(process.env.IMPETUS_SHADOW_ROUTES_ENABLED ?? 'true').trim().toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'off';
}

function routeEnvFlagEnabled(flagName) {
  if (!flagName) return false;
  return String(process.env[flagName] ?? '').trim() === 'true';
}

function recordShadowAccess(req, routeId, decision, extra = {}) {
  const entry = {
    event: 'SHADOW_ROUTE_ACCESS',
    route_id: routeId,
    decision,
    path: req.originalUrl || req.path,
    method: req.method,
    ip: req.ip,
    user_id: req.user?.id || null,
    company_id: req.user?.company_id || null,
    at: new Date().toISOString(),
    ...extra
  };
  _auditBuffer.push(entry);
  if (_auditBuffer.length > MAX_AUDIT) _auditBuffer.shift();
  console.info('[SHADOW_ROUTE_ACCESS]', JSON.stringify(entry));
}

/**
 * Middleware factory para rotas shadow registadas.
 * @param {string} routeId — id no REGISTRY
 */
function requireShadowRoute(routeId) {
  const route = REGISTRY.find((r) => r.id === routeId);
  if (!route) {
    throw new Error(`Shadow route not registered: ${routeId}`);
  }

  return function shadowRouteGuard(req, res, next) {
    if (!shadowRoutesGloballyEnabled()) {
      recordShadowAccess(req, routeId, 'denied_global_off', { production: isProduction() });
      return res.status(404).json({
        ok: false,
        code: 'SHADOW_ROUTES_DISABLED',
        error: 'Shadow routes disabled (IMPETUS_SHADOW_ROUTES_ENABLED=false).'
      });
    }

    if (isProduction() && route.productionAllowed === false) {
      if (!routeEnvFlagEnabled(route.envFlag)) {
        recordShadowAccess(req, routeId, 'denied_production_flag', {
          env_flag: route.envFlag
        });
        return res.status(404).json({
          ok: false,
          code: 'SHADOW_ROUTE_NOT_AVAILABLE',
          error: `Rota shadow indisponível em produção sem ${route.envFlag}=true.`
        });
      }
    }

    if (!routeEnvFlagEnabled(route.envFlag)) {
      recordShadowAccess(req, routeId, 'denied_flag', { env_flag: route.envFlag });
      return res.status(403).json({
        ok: false,
        code: 'SHADOW_ROUTE_FLAG_DISABLED',
        error: `Defina ${route.envFlag}=true para activar (shadow).`
      });
    }

    recordShadowAccess(req, routeId, 'allowed', { env_flag: route.envFlag });
    return next();
  };
}

function getRegistry() {
  return REGISTRY.map((r) => ({
    ...r,
    globally_enabled: shadowRoutesGloballyEnabled(),
    flag_enabled: routeEnvFlagEnabled(r.envFlag),
    production: isProduction()
  }));
}

function getAuditLog(limit = 50) {
  return _auditBuffer.slice(-Math.min(limit, MAX_AUDIT));
}

module.exports = {
  REGISTRY,
  requireShadowRoute,
  getRegistry,
  getAuditLog,
  shadowRoutesGloballyEnabled,
  isProduction
};
