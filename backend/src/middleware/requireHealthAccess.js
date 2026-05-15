'use strict';

/**
 * Acesso ao painel GET /api/internal/unified-health.
 * Papéis de liderança: visão executiva (filtrada no handler).
 * Admin do tenant (role admin, tenant_admins, system_administration): mesmo endpoint, payload completo no handler.
 */

const ROLE_BASE = new Set(['internal_admin', 'admin', 'ceo', 'diretor', 'gerente', 'coordenador']);

function normalizeRole(role) {
  if (role == null) return '';
  return String(role).trim().toLowerCase();
}

function userMayAccessUnifiedHealth(user) {
  if (!user) return false;
  const userRole = normalizeRole(user.role);
  if (userRole && ROLE_BASE.has(userRole)) return true;
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

function requireHealthAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      error: 'NOT_AUTHENTICATED',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!userMayAccessUnifiedHealth(req.user)) {
    return res.status(403).json({
      ok: false,
      error: 'FORBIDDEN_HEALTH_ACCESS'
    });
  }

  next();
}

module.exports = {
  requireHealthAccess,
  HEALTH_ACCESS_ROLES: ROLE_BASE,
  userMayAccessUnifiedHealth
};
