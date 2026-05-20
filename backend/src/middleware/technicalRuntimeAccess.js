'use strict';

const guard = require('../domainAuthority/guards/technicalRuntimeAccessGuard');

/**
 * Middleware — bloqueia exposição de runtime técnico bruto a perfis operacionais.
 */
function requireTechnicalRuntimeAccess(scope) {
  return (req, res, next) => {
    const decision = guard.evaluateTechnicalRuntimeAccess(req.user, {
      scope: scope || 'api',
      route: req.path
    });
    if (decision.allowed) return next();
    return res.status(403).json({
      ok: false,
      code: 'TECHNICAL_RUNTIME_DENIED',
      user_message: decision.user_message,
      redirect_path: decision.redirect_path,
      axis: decision.axis
    });
  };
}

function sanitizeTechnicalResponse(scope) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const safe = guard.sanitizeTechnicalPayload(body, req.user);
      return originalJson(safe);
    };
    next();
  };
}

module.exports = { requireTechnicalRuntimeAccess, sanitizeTechnicalResponse };
