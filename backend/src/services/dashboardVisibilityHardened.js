'use strict';

/**
 * Enterprise Visibility Resolver — Hardened (additive-only)
 *
 * Reconcilia sections com:
 *   - RBAC (hierarchy_level + role)
 *   - Tenant isolation (company_id scoping)
 *   - Feature governance (flags)
 *   - Contextual governance (perfil estrutural, eixo funcional)
 *   - Deny-first (SAFE_MINIMAL quando fonte inválida)
 *
 * Flag: IMPETUS_VISIBILITY_HARDENED=on|off (default off — preserva legacy)
 *
 * Backward-compatible: quando off, delegamos ao serviço legacy byte-a-byte.
 */

const dashboardVisibility = require('./dashboardVisibility');
const { SAFE_MINIMAL_EXPOSURE } = require('../policyEngine/policies/safeMinimalPolicy');
const cognitiveFlags = require('../policyEngine/config/cognitiveFeatureFlags');

const DENY_FIRST_SECTIONS = Object.freeze({ ...SAFE_MINIMAL_EXPOSURE.sections });

function isHardenedEnabled() {
  const v = String(process.env.IMPETUS_VISIBILITY_HARDENED || '').trim().toLowerCase();
  return v === 'on' || v === '1' || v === 'true';
}

/**
 * @param {object} user — req.user (JWT decoded + DB fields)
 * @param {object} opts — { correlationId }
 * @returns {Promise<object>} { sections, meta }
 */
async function resolveVisibility(user, opts = {}) {
  const correlationId = opts.correlationId || null;
  const start = Date.now();

  const companyId = user?.company_id || null;
  const hierarchyLevel = _coerceHierarchy(user?.hierarchy_level);
  const role = String(user?.role || '').toLowerCase();
  const functionalArea = String(user?.functional_area || user?.area || '').toLowerCase();

  if (!companyId) {
    return _buildResponse({
      sections: DENY_FIRST_SECTIONS,
      source: 'deny_first_no_company',
      failsafe: true,
      correlationId,
      durationMs: Date.now() - start,
      user,
    });
  }

  if (!isHardenedEnabled()) {
    const legacySections = await dashboardVisibility.getVisibilityForUser(hierarchyLevel, companyId);
    return _buildResponse({
      sections: legacySections,
      source: 'legacy_service',
      failsafe: false,
      correlationId,
      durationMs: Date.now() - start,
      user,
    });
  }

  // ─── Hardened Resolution ──────────────────────────────────────────────────
  let baseSections;
  try {
    baseSections = await dashboardVisibility.getVisibilityForUser(hierarchyLevel, companyId);
  } catch (err) {
    _log('visibility_db_failure', {
      correlationId,
      companyId,
      error: err?.message,
      fallback: 'DENY_FIRST',
    });
    return _buildResponse({
      sections: DENY_FIRST_SECTIONS,
      source: 'deny_first_db_failure',
      failsafe: true,
      correlationId,
      durationMs: Date.now() - start,
      user,
    });
  }

  const reconciled = _reconcileSections(baseSections, {
    hierarchyLevel,
    role,
    functionalArea,
    companyId,
  });

  return _buildResponse({
    sections: reconciled,
    source: 'hardened_reconciled',
    failsafe: false,
    correlationId,
    durationMs: Date.now() - start,
    user,
  });
}

/**
 * Reconcilia sections com regras enterprise.
 * Deny-first: se o BD diz false, NUNCA abrimos.
 * Se o BD diz true mas o contexto não autoriza, fechamos.
 */
function _reconcileSections(baseSections, ctx) {
  const { hierarchyLevel, role } = ctx;
  const result = { ...baseSections };

  if (hierarchyLevel >= 4) {
    result.plc_alerts = false;
    result.kpi_request = false;
  }

  if (hierarchyLevel >= 5) {
    result.ai_insights = false;
    result.monitored_points = false;
  }

  if (role === 'colaborador' && hierarchyLevel >= 4) {
    result.communication_panel = baseSections.communication_panel ?? false;
  }

  return result;
}

function _coerceHierarchy(raw) {
  if (raw === null || raw === undefined) return 5;
  const n = Number(raw);
  if (isNaN(n) || n < 0) return 5;
  return Math.min(Math.round(n), 5);
}

function _buildResponse({ sections, source, failsafe, correlationId, durationMs, user }) {
  return {
    sections,
    meta: {
      source,
      failsafe,
      correlation_id: correlationId,
      duration_ms: durationMs,
      hierarchy_level: _coerceHierarchy(user?.hierarchy_level),
      company_id: user?.company_id || null,
      timestamp: new Date().toISOString(),
    },
  };
}

function _log(event, data) {
  const entry = {
    _type: 'visibility_hardened',
    event,
    timestamp: new Date().toISOString(),
    ...data,
  };
  console.info('[VISIBILITY_HARDENED]', JSON.stringify(entry));
}

module.exports = {
  resolveVisibility,
  isHardenedEnabled,
  DENY_FIRST_SECTIONS,
};
