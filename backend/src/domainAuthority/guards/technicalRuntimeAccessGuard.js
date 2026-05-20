'use strict';

const catalog = require('../../config/functionalAreaCatalog');
const domainFlags = require('../config/domainFeatureFlags');
const { logPhaseD } = require('../observability/phaseDLogger');

const TECHNICAL_ROLES = new Set([
  'internal_admin',
  'super_admin',
  'platform_admin',
  'observability_admin',
  'engineering_admin'
]);

const TECHNICAL_AXES = new Set(['engineering', 'admin', 'industrial']);

function resolveUserAxis(user) {
  if (!user) return 'operations';
  const explicit = user.functional_axis || user.functional_area;
  if (explicit) {
    const id = catalog.isKnownId(catalog.normKey(explicit)) ?
      catalog.normKey(explicit) :
      catalog.resolveIdFromText(explicit);
    if (id) return catalog.getAxis(id) || id;
  }
  const fromDept = catalog.resolveIdFromText(
    [user.department, user.job_title, user.company_role_name].filter(Boolean).join(' ')
  );
  if (fromDept) return catalog.getAxis(fromDept) || fromDept;
  return 'operations';
}

function isTechnicalRole(user) {
  if (!user) return false;
  const role = String(user.role || user.perfil || '').toLowerCase();
  if (TECHNICAL_ROLES.has(role)) return true;
  if (user.is_internal_admin || user.is_tenant_admin && user.tenant_admin_type === 'primary') {
    /* tenant primary admin — operational UX only unless engineering */
    return false;
  }
  if (role === 'admin' && user.hierarchy_level <= 1) return true;
  if (String(user.email || '').endsWith('@impetus.internal')) return true;
  return false;
}

/**
 * @param {object} user
 * @param {{ scope?: string, route?: string }} ctx
 */
function evaluateTechnicalRuntimeAccess(user, ctx = {}) {
  if (!domainFlags.isRuntimeTechnicalGuardEnabled()) {
    return { allowed: true, reason: 'guard_disabled' };
  }

  const axis = resolveUserAxis(user);
  const scope = ctx.scope || 'technical_runtime';

  if (isTechnicalRole(user) || TECHNICAL_AXES.has(axis)) {
    logPhaseD('TECHNICAL_RUNTIME_ALLOWED', {
      user_id: user?.id,
      axis,
      scope,
      route: ctx.route
    });
    return { allowed: true, reason: 'technical_role_or_axis', axis };
  }

  const operationalAxes = new Set([
    'safety',
    'environmental',
    'sustainability',
    'esg',
    'utilities',
    'operations',
    'maintenance',
    'logistics',
    'hr',
    'finance',
    'quality',
    'legal',
    'compliance'
  ]);

  if (operationalAxes.has(axis)) {
    const redirect =
      axis === 'safety' ?
        '/app/safety/operational' :
        axis === 'environmental' || axis === 'sustainability' || axis === 'esg' || axis === 'utilities' ?
          '/app/environment/operational' :
          '/app';
    logPhaseD('TECHNICAL_RUNTIME_DENIED', {
      user_id: user?.id,
      axis,
      scope,
      route: ctx.route,
      redirect_hint: redirect,
      reason: 'operational_domain_no_technical_runtime'
    });
    return {
      allowed: false,
      reason: 'domain_not_authorized',
      axis,
      user_message:
        'Detalhes técnicos de runtime (conectores, topologia, flags) estão disponíveis apenas para engenharia de plataforma.',
      redirect_path: redirect
    };
  }

  logPhaseD('TECHNICAL_RUNTIME_ALLOWED', { user_id: user?.id, axis, scope, reason: 'default' });
  return { allowed: true, reason: 'default', axis };
}

function sanitizeTechnicalPayload(payload, user) {
  const decision = evaluateTechnicalRuntimeAccess(user, { scope: 'payload_sanitize' });
  if (decision.allowed) return payload;
  logPhaseD('TECHNICAL_RUNTIME_EXPOSED_ATTEMPT', { user_id: user?.id, axis: decision.axis });
  return {
    ok: true,
    view: 'operational_summary',
    user_message: decision.user_message,
    redirect_path: decision.redirect_path,
    technical_detail_available: false
  };
}

module.exports = {
  evaluateTechnicalRuntimeAccess,
  sanitizeTechnicalPayload,
  resolveUserAxis,
  isTechnicalRole
};
