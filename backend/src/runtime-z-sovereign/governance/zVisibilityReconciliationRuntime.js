'use strict';

/**
 * zVisibilityReconciliationRuntime — Reconciliação de Visibilidade Enterprise
 *
 * Valida coerência entre todas as layers da cadeia de autoridade:
 *   1. Identity Runtime (quem o utilizador é)
 *   2. RBAC / Governance Engine (o que pode aceder)
 *   3. governed_visible_modules (o que é entregue ao frontend)
 *   4. Normalização semântica (o que deveria ter)
 *
 * Se houver divergência, gera observabilidade e reconcilia de forma additive.
 *
 * Invariantes:
 *   - Nunca remove módulos já autorizados pelo governance engine
 *   - Apenas adiciona módulos que o domain authority exige mas faltam
 *   - Produz trace de reconciliação para auditoria
 *   - Rollback-safe via flag IMPETUS_Z_VISIBILITY_RECONCILIATION
 */

const normRuntime = require('../identity/zOperationalRoleNormalizationRuntime');

function isEnabled() {
  const v = String(process.env.IMPETUS_Z_VISIBILITY_RECONCILIATION || 'true').toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'off';
}

/**
 * @typedef {object} ReconciliationInput
 * @property {object} user - user object com role, job_title, etc.
 * @property {string[]} governed_visible_modules - módulos autorizados pelo governance engine
 * @property {object} [module_access_governance] - bloco de governance do engine
 * @property {object} [module_access_context] - contexto de acesso do engine
 * @property {object} [identity] - identidade resolvida pelo identity runtime
 */

/**
 * @typedef {object} ReconciliationResult
 * @property {string[]} reconciled_modules - módulos finais após reconciliação
 * @property {string[]} added_modules - módulos adicionados pela reconciliação
 * @property {object[]} mismatches - divergências detectadas
 * @property {boolean} reconciliation_applied - se houve reconciliação
 * @property {object} trace - trace de auditoria
 */

/**
 * Módulos universais que nunca entram em reconciliação.
 */
const UNIVERSAL_BYPASS = new Set([
  'dashboard', 'settings', 'proaction', 'registro_inteligente',
  'cadastrar_com_ia', 'chat', 'ai', 'biblioteca'
]);

/**
 * Reconcilia visibilidade entre identity, governance e normalização.
 * @param {ReconciliationInput} input
 * @returns {ReconciliationResult}
 */
function reconcileVisibility(input = {}) {
  const {
    user = {},
    governed_visible_modules = [],
    module_access_governance,
    module_access_context
  } = input;

  const trace = {
    runtime: 'zVisibilityReconciliationRuntime',
    timestamp: new Date().toISOString(),
    steps: []
  };

  if (!isEnabled()) {
    return {
      reconciled_modules: governed_visible_modules,
      added_modules: [],
      mismatches: [],
      reconciliation_applied: false,
      trace: { ...trace, skipped: true, reason: 'reconciliation_disabled' }
    };
  }

  if (!normRuntime.isEnabled()) {
    return {
      reconciled_modules: governed_visible_modules,
      added_modules: [],
      mismatches: [],
      reconciliation_applied: false,
      trace: { ...trace, skipped: true, reason: 'normalization_runtime_disabled' }
    };
  }

  const normalizedIdentity = normRuntime.resolveNormalizedIdentity({
    role: user.role,
    cargo_name: module_access_context?.cargo || user.job_title,
    department: user.department,
    job_title: user.job_title,
    functional_area: user.functional_area || module_access_context?.functional_area
  });

  trace.steps.push({
    step: 'normalized_identity',
    result: {
      normalized_role: normalizedIdentity.normalized_role,
      hierarchy_level: normalizedIdentity.hierarchy_level,
      domain_authority: normalizedIdentity.domain_authority,
      domain_module_keys: normalizedIdentity.domain_module_keys
    }
  });

  const governedSet = new Set(governed_visible_modules);
  const mismatches = [];
  const addedModules = [];

  if (normalizedIdentity.domain_authority) {
    const expectedModules = normalizedIdentity.domain_module_keys;

    for (const expectedKey of expectedModules) {
      if (UNIVERSAL_BYPASS.has(expectedKey)) continue;
      if (!governedSet.has(expectedKey)) {
        mismatches.push({
          type: 'missing_domain_module',
          severity: 'high',
          module: expectedKey,
          domain_authority: normalizedIdentity.domain_authority,
          expected: true,
          present: false,
          reason: `Domain authority ${normalizedIdentity.domain_authority} expects module "${expectedKey}" but it was not in governed_visible_modules`
        });

        const govComplete = module_access_governance?.structural_complete === true;
        const govBypass = module_access_governance?.executive_structural_bypass === true;
        const govAuthoritative =
          module_access_governance?.engine === 'moduleAccessGovernanceEngine' ||
          module_access_governance?.cadastro_fiel === true;

        if ((govComplete || govBypass) && !govAuthoritative) {
          governedSet.add(expectedKey);
          addedModules.push(expectedKey);
          trace.steps.push({
            step: 'additive_reconciliation',
            module: expectedKey,
            reason: govComplete ? 'structural_complete_domain_match' : 'executive_bypass_domain_match'
          });
        } else if (govAuthoritative) {
          trace.steps.push({
            step: 'reconciliation_skipped',
            module: expectedKey,
            reason: 'module_access_governance_authoritative'
          });
        } else {
          trace.steps.push({
            step: 'reconciliation_deferred',
            module: expectedKey,
            reason: 'structural_incomplete_no_bypass'
          });
        }
      }
    }

    for (const visibleKey of governed_visible_modules) {
      if (UNIVERSAL_BYPASS.has(visibleKey)) continue;
      if (visibleKey === 'operational' || visibleKey === 'anomaly_detection' || visibleKey === 'audit') continue;

      const authorizedDomains = normRuntime.getDomainsForModule(visibleKey);
      if (authorizedDomains.length > 0 && !authorizedDomains.includes(normalizedIdentity.domain_authority)) {
        mismatches.push({
          type: 'cross_domain_module',
          severity: 'info',
          module: visibleKey,
          user_domain: normalizedIdentity.domain_authority,
          module_domains: authorizedDomains,
          reason: `Module "${visibleKey}" is from domain(s) [${authorizedDomains.join(', ')}] but user domain is ${normalizedIdentity.domain_authority}`
        });
      }
    }
  }

  const hierarchyExpected = normalizedIdentity.hierarchy_level;
  const govHierarchy = module_access_context?.hierarchy_level ?? user.hierarchy_level;
  if (govHierarchy != null && hierarchyExpected != null && govHierarchy !== hierarchyExpected) {
    mismatches.push({
      type: 'hierarchy_mismatch',
      severity: 'medium',
      governance_level: govHierarchy,
      normalized_level: hierarchyExpected,
      reason: `Governance hierarchy_level (${govHierarchy}) differs from normalized (${hierarchyExpected})`
    });
  }

  trace.steps.push({
    step: 'reconciliation_complete',
    mismatches_count: mismatches.length,
    added_count: addedModules.length,
    final_count: governedSet.size
  });

  return {
    reconciled_modules: [...governedSet],
    added_modules: addedModules,
    mismatches,
    reconciliation_applied: addedModules.length > 0 || mismatches.length > 0,
    normalized_identity: normalizedIdentity,
    trace
  };
}

/**
 * Gera bloco de observabilidade para inclusão no payload do dashboard.
 */
function buildObservabilityBlock(reconciliationResult) {
  if (!reconciliationResult) return null;
  // Idempotência: se já for um bloco construído (sem o array bruto `mismatches`),
  // devolve tal como está — evita dupla-processagem e leitura de undefined.length.
  if (reconciliationResult.runtime === 'zVisibilityReconciliationRuntime'
      || !Array.isArray(reconciliationResult.mismatches)) {
    return reconciliationResult;
  }
  const mismatches = reconciliationResult.mismatches;
  return {
    reconciliation_applied: reconciliationResult.reconciliation_applied,
    added_modules: reconciliationResult.added_modules || [],
    mismatches_count: mismatches.length,
    mismatches_high: mismatches.filter((m) => m.severity === 'high').length,
    domain_authority: reconciliationResult.normalized_identity?.domain_authority || null,
    normalized_role: reconciliationResult.normalized_identity?.normalized_role || null,
    runtime: 'zVisibilityReconciliationRuntime'
  };
}

module.exports = {
  isEnabled,
  reconcileVisibility,
  buildObservabilityBlock
};
