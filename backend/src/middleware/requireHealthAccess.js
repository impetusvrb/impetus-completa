'use strict';

/**
 * Acesso ao painel GET /api/internal/unified-health.
 * Qualquer perfil operacional autenticado pode aceder (API controla profundidade dos dados).
 * Rejeitado apenas para papéis sem contexto no sistema (ai_system, colaborador puro sem hierarquia).
 */

const ALLOWED = new Set([
  'internal_admin',
  'admin',
  'tenant_admin',
  'company_admin',
  'administrator',
  'system_admin',
  'super_admin',
  'administrador',
  'administradora',
  'ceo',
  'diretor',
  'gerente',
  'coordenador',
  'supervisor'
]);

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
  const profile =
    req.user.dashboard_profile != null
      ? String(req.user.dashboard_profile).trim().toLowerCase()
      : '';
  const okRole        = userRole && ALLOWED.has(userRole);
  const okProfile     = profile === 'admin_system';
  const okCompanyRoot = req.user.is_company_root === true;
  const okHierarchy   = Number.isFinite(Number(req.user.hierarchy_level)) && Number(req.user.hierarchy_level) <= 2;

  if (!okRole && !okProfile && !okCompanyRoot && !okHierarchy) {
    console.warn('[HEALTH_ACCESS_DENIED]', {
      userId:    req.user.id,
      role:      userRole || '(empty)',
      profile:   profile || '(empty)',
      hierarchy: req.user.hierarchy_level
    });
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
