/**
 * executiveBaselinePack — Baseline Cognitivo Executivo (Volume III ICEB)
 *
 * Representa oficialmente o conjunto de módulos transversais que toda a
 * diretoria (CEO + diretores, hierarchy_level ≤ 1) deve possuir quando a
 * Base Estrutural está completa (Modo 2 — structural_complete=true).
 *
 * Propósito:
 *   - Materializar no runtime o CORE executivo definido em dashboardProfiles,
 *     domainDashboardProfiles e domainRegistry.UNIVERSAL_MODULES.
 *   - Complementar authorized_menu_keys do cadastro — nunca substituí-los.
 *   - Manter módulos exclusivos de domínio (financial_intelligence, hr_intelligence,
 *     quality_intelligence, manuia, etc.) fora deste pack.
 *
 * Não altera RBAC, Domain Registry nem perfis de dashboard.
 */
'use strict';

/** Módulos transversais de diretoria — sem exclusivos de domínio. */
const EXECUTIVE_BASELINE_PACK = Object.freeze([
  'ai',
  'biblioteca',
  'audit',
  'operational',
  'anomaly_detection'
]);

const ELIGIBLE_EXECUTIVE_ROLES = Object.freeze(new Set(['ceo', 'diretor']));

const ROLE_NORMALIZATION = Object.freeze({
  director: 'diretor',
  directora: 'diretor'
});

const MAX_EXECUTIVE_HIERARCHY_LEVEL = 1;

function _normalizeRole(role) {
  const raw = String(role || '').toLowerCase().trim();
  return ROLE_NORMALIZATION[raw] || raw;
}

/**
 * Elegibilidade estrutural para o Executive Baseline Pack.
 * Critério independente de isExecutiveStructuralBypass (mais restritivo).
 *
 * @param {object} ctx — { role, hierarchy_level }
 * @returns {{ eligible: boolean, reason?: string, role?: string, hierarchy_level?: number }}
 */
function isExecutiveBaselineEligible(ctx) {
  if (!ctx) {
    return { eligible: false, reason: 'missing_context' };
  }

  const role = _normalizeRole(ctx.role);
  if (!ELIGIBLE_EXECUTIVE_ROLES.has(role)) {
    return { eligible: false, reason: 'role_not_executive', role };
  }

  const rawHl = ctx.hierarchy_level;
  if (rawHl == null || rawHl === '') {
    return { eligible: false, reason: 'hierarchy_missing', role };
  }

  const hl = Number(rawHl);
  if (!Number.isFinite(hl) || hl > MAX_EXECUTIVE_HIERARCHY_LEVEL) {
    return {
      eligible: false,
      reason: 'hierarchy_above_executive',
      role,
      hierarchy_level: hl
    };
  }

  return { eligible: true, role, hierarchy_level: hl };
}

/**
 * Decide se o baseline deve ser aplicado neste contexto de governança.
 *
 * @param {object} ctx — { structural_complete, role, hierarchy_level }
 */
function shouldApplyExecutiveBaseline(ctx) {
  if (ctx?.structural_complete !== true) {
    return { apply: false, reason: 'structural_incomplete' };
  }

  const eligibility = isExecutiveBaselineEligible(ctx);
  if (!eligibility.eligible) {
    return { apply: false, reason: eligibility.reason, ...eligibility };
  }

  return { apply: true, reason: null, ...eligibility };
}

function _logExecutiveBaselineApplied(ctx, payload) {
  try {
    console.log(
      'EXECUTIVE_BASELINE_APPLIED',
      JSON.stringify({
        ts: new Date().toISOString(),
        user_id: ctx?.user_id || null,
        role: payload.role,
        hierarchy_level: payload.hierarchy_level,
        baseline_modules: payload.baseline_modules,
        authorized_menu_keys_before: payload.before,
        authorized_menu_keys_after: payload.after,
        modules_added: payload.added
      })
    );
  } catch (_) {
    /* never break delivery */
  }
}

function _logExecutiveBaselineSkipped(ctx, payload) {
  try {
    console.log(
      'EXECUTIVE_BASELINE_SKIPPED',
      JSON.stringify({
        ts: new Date().toISOString(),
        user_id: ctx?.user_id || null,
        role: _normalizeRole(ctx?.role),
        hierarchy_level: ctx?.hierarchy_level ?? null,
        structural_complete: ctx?.structural_complete === true,
        reason: payload.reason
      })
    );
  } catch (_) {
    /* never break delivery */
  }
}

/**
 * Complementa authorized_menu_keys com o Executive Baseline Pack quando aplicável.
 * Aditivo — nunca remove keys existentes.
 *
 * @param {string[]} authorizedMenuKeys
 * @param {object} ctx — contexto de governança (structural_complete, role, hierarchy_level, user_id)
 * @returns {{ keys: string[], applied: boolean, baseline_modules: string[], before: string[], after: string[], added?: string[], reason?: string }}
 */
function mergeExecutiveBaselineIntoAuthorizedKeys(authorizedMenuKeys, ctx) {
  const before = [...(Array.isArray(authorizedMenuKeys) ? authorizedMenuKeys : [])];
  const decision = shouldApplyExecutiveBaseline(ctx);

  if (!decision.apply) {
    _logExecutiveBaselineSkipped(ctx, decision);
    return {
      keys: before,
      applied: false,
      baseline_modules: [],
      before,
      after: before,
      reason: decision.reason
    };
  }

  const merged = [...new Set([...before, ...EXECUTIVE_BASELINE_PACK])];
  const added = EXECUTIVE_BASELINE_PACK.filter((k) => !before.includes(k));

  _logExecutiveBaselineApplied(ctx, {
    role: decision.role,
    hierarchy_level: decision.hierarchy_level,
    baseline_modules: [...EXECUTIVE_BASELINE_PACK],
    before,
    after: merged,
    added
  });

  return {
    keys: merged,
    applied: true,
    baseline_modules: [...EXECUTIVE_BASELINE_PACK],
    before,
    after: merged,
    added,
    reason: null
  };
}

module.exports = {
  EXECUTIVE_BASELINE_PACK,
  ELIGIBLE_EXECUTIVE_ROLES,
  MAX_EXECUTIVE_HIERARCHY_LEVEL,
  isExecutiveBaselineEligible,
  shouldApplyExecutiveBaseline,
  mergeExecutiveBaselineIntoAuthorizedKeys
};
