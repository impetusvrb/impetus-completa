'use strict';

/**
 * Acesso ao painel GET /api/internal/unified-health.
 * internal_admin: visão completa | ceo, diretor, gerente, coordenador: visão restrita (filtrada no handler).
 */

const ALLOWED = new Set(['internal_admin', 'ceo', 'diretor', 'gerente', 'coordenador']);

function normalizeRole(role) {
  if (role == null) return '';
  return String(role).trim().toLowerCase();
}

function requireHealthAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      error: 'NOT_AUTHENTICATED',
      code: 'AUTH_REQUIRED'
    });
  }

  const userRole = normalizeRole(req.user.role);
  if (!userRole || !ALLOWED.has(userRole)) {
    return res.status(403).json({
      ok: false,
      error: 'FORBIDDEN_HEALTH_ACCESS'
    });
  }

  next();
}

module.exports = {
  requireHealthAccess,
  HEALTH_ACCESS_ROLES: ALLOWED
};
