'use strict';

/**
 * zIdentityObservabilityRuntime — Painel de Observabilidade Enterprise
 *
 * Consolida num único bloco toda a informação de identidade, governance,
 * normalização e reconciliação para diagnóstico runtime.
 *
 * Este bloco é incluído aditivamente no payload de /dashboard/me
 * quando IMPETUS_Z_IDENTITY_OBSERVABILITY=on (default: on).
 */

const normRuntime = require('../identity/zOperationalRoleNormalizationRuntime');
const reconciliationRuntime = require('../governance/zVisibilityReconciliationRuntime');

function isEnabled() {
  const v = String(process.env.IMPETUS_Z_IDENTITY_OBSERVABILITY || 'true').toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'off';
}

/**
 * Constrói o bloco completo de observabilidade.
 * @param {object} params
 * @returns {object|null}
 */
function buildIdentityObservabilityBlock(params = {}) {
  if (!isEnabled()) return null;

  const {
    user = {},
    visible_modules = [],
    module_access_governance,
    module_access_context,
    profile_code,
    functional_area,
    reconciliation_result
  } = params;

  let normalizedIdentity = null;
  if (normRuntime.isEnabled()) {
    normalizedIdentity = normRuntime.resolveNormalizedIdentity({
      role: user.role,
      cargo_name: module_access_context?.cargo || user.job_title,
      department: user.department,
      job_title: user.job_title,
      functional_area: functional_area || user.functional_area
    });
  }

  const reconciliationObs = reconciliation_result
    ? reconciliationRuntime.buildObservabilityBlock(reconciliation_result)
    : null;

  const universalModules = visible_modules.filter((m) =>
    ['dashboard', 'settings', 'proaction', 'registro_inteligente', 'cadastrar_com_ia', 'chat', 'ai', 'biblioteca'].includes(m)
  );
  const contextualModules = visible_modules.filter((m) => !universalModules.includes(m));

  return {
    runtime: 'zIdentityObservabilityRuntime',
    version: 1,
    timestamp: new Date().toISOString(),

    user_identity: {
      user_id: user.id || null,
      name: user.name || null,
      role: user.role || null,
      normalized_role: normalizedIdentity?.normalized_role || null,
      hierarchy_level: normalizedIdentity?.hierarchy_level ?? user.hierarchy_level ?? null,
      domain_authority: normalizedIdentity?.domain_authority || null
    },

    governance: {
      profile_code: profile_code || null,
      functional_area: functional_area || null,
      structural_complete: module_access_governance?.structural_complete ?? null,
      executive_bypass: module_access_governance?.executive_structural_bypass ?? false,
      cadastro_fiel: module_access_governance?.cadastro_fiel ?? null,
      engine: module_access_governance?.engine || 'moduleAccessGovernanceEngine'
    },

    visibility: {
      total_modules: visible_modules.length,
      universal_count: universalModules.length,
      contextual_count: contextualModules.length,
      contextual_modules: contextualModules,
      denied_count: module_access_governance?.denied_count ?? 0,
      domain_expected_modules: normalizedIdentity?.domain_module_keys || []
    },

    reconciliation: reconciliationObs,

    authority_chain: [
      { layer: 'zIdentityRuntime', role: 'identity_resolution', stage: 'shadow' },
      { layer: 'moduleAccessGovernanceEngine', role: 'module_authorization', stage: 'active' },
      { layer: 'zOperationalRoleNormalizationRuntime', role: 'semantic_normalization', stage: normRuntime.isEnabled() ? 'active' : 'off' },
      { layer: 'zVisibilityReconciliationRuntime', role: 'visibility_reconciliation', stage: reconciliationRuntime.isEnabled() ? 'active' : 'off' }
    ],

    sovereignty: {
      canonical_source: 'moduleAccessGovernanceEngine',
      reconciliation_source: 'zVisibilityReconciliationRuntime',
      normalization_source: 'zOperationalRoleNormalizationRuntime',
      identity_source: 'zIdentityRuntime → engine_v2_identity_resolver'
    }
  };
}

module.exports = {
  isEnabled,
  buildIdentityObservabilityBlock
};
