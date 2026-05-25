'use strict';

/**
 * zSovereignGovernanceLock — Lock de Governança Soberana
 *
 * Garante que:
 *   1. Runtime Z é a autoridade final contextual
 *   2. Motor A permanece como fallback supervisionado
 *   3. Frontend não pode divergir semanticamente do backend
 *   4. governed_visible_modules é tratado como canonical source
 *   5. Normalização semântica é aplicada antes da entrega
 *   6. Reconciliação de visibilidade corrige divergências aditivamente
 *
 * Este módulo não substitui zSovereigntyGovernanceRuntime — estende-o
 * com enforcement de coerência entre layers da cadeia de autoridade.
 *
 * Invariantes:
 *   - Additive-only: nunca remove capability existente
 *   - Rollback-safe: desactivável via IMPETUS_Z_SOVEREIGN_LOCK
 *   - Preserva Motor A, Engine V2, SZ1-SZ5
 */

const normRuntime = require('../identity/zOperationalRoleNormalizationRuntime');
const reconciliationRuntime = require('../governance/zVisibilityReconciliationRuntime');

function isEnabled() {
  const v = String(process.env.IMPETUS_Z_SOVEREIGN_LOCK || 'true').toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'off';
}

/**
 * Cadeia de autoridade oficial.
 * Documenta a ordem de precedência para identidade e visibilidade.
 */
const AUTHORITY_CHAIN = Object.freeze([
  {
    order: 1,
    runtime: 'zIdentityRuntime',
    role: 'identity_resolution',
    source: 'engine_v2_identity_resolver (delegated)',
    authority: 'contextual_identity',
    stage: 'active'
  },
  {
    order: 2,
    runtime: 'zOperationalRoleNormalizationRuntime',
    role: 'semantic_normalization',
    source: 'domain_patterns + hierarchy_normalization',
    authority: 'normalized_identity',
    stage: 'active'
  },
  {
    order: 3,
    runtime: 'moduleAccessGovernanceEngine',
    role: 'module_authorization',
    source: 'structuralCadastroModuleResolver + organizationalIdentityEngine',
    authority: 'governed_visible_modules (canonical)',
    stage: 'active'
  },
  {
    order: 4,
    runtime: 'zModuleAuthorityRuntime',
    role: 'module_authority_delegation',
    source: 'dashboardAccessService → moduleAccessGovernanceEngine',
    authority: 'visible_modules + permissions + ia_depth',
    stage: 'active'
  },
  {
    order: 5,
    runtime: 'zVisibilityReconciliationRuntime',
    role: 'visibility_reconciliation',
    source: 'normalization × governance cross-validation',
    authority: 'reconciled_modules (additive-only)',
    stage: 'active'
  },
  {
    order: 6,
    runtime: 'operationalIdentityEnforcementMiddleware',
    role: 'identity_enforcement',
    source: 'request pipeline enforcement',
    authority: 'request-scoped identity context',
    stage: 'active'
  },
  {
    order: 7,
    runtime: 'frontend_hydration',
    role: 'visibility_consumption',
    source: 'canonicalVisibleModules + visibilitySovereigntyGuard',
    authority: 'rendered_modules (read-only from backend)',
    stage: 'active'
  }
]);

/**
 * Valida que a cadeia de autoridade está íntegra.
 * Retorna violações se alguma layer não está operacional.
 */
function validateAuthorityChain() {
  if (!isEnabled()) {
    return { valid: true, locked: false, violations: [] };
  }

  const violations = [];

  if (!normRuntime.isEnabled()) {
    violations.push({
      layer: 'zOperationalRoleNormalizationRuntime',
      violation: 'disabled',
      impact: 'semantic_normalization_not_applied',
      severity: 'medium'
    });
  }

  if (!reconciliationRuntime.isEnabled()) {
    violations.push({
      layer: 'zVisibilityReconciliationRuntime',
      violation: 'disabled',
      impact: 'visibility_reconciliation_not_applied',
      severity: 'medium'
    });
  }

  const govEnabled = (() => {
    try {
      const gov = require('../../services/moduleAccessGovernanceEngine');
      return typeof gov.isEnabled === 'function' && gov.isEnabled();
    } catch (_) {
      return false;
    }
  })();

  if (!govEnabled) {
    violations.push({
      layer: 'moduleAccessGovernanceEngine',
      violation: 'disabled_or_missing',
      impact: 'module_authorization_not_governed',
      severity: 'critical'
    });
  }

  return {
    valid: violations.length === 0,
    locked: true,
    violations,
    authority_chain: AUTHORITY_CHAIN,
    runtime: 'zSovereignGovernanceLock',
    timestamp: new Date().toISOString()
  };
}

/**
 * Aplica o lock soberano a um payload de /dashboard/me antes da entrega.
 * Não muta o payload original — retorna metadados adicionais.
 */
function applySovereignLock(payload = {}) {
  if (!isEnabled()) {
    return { sovereign_lock_applied: false, reason: 'lock_disabled' };
  }

  const chainValidation = validateAuthorityChain();

  const moduleSource = payload.sidebar_governance_runtime?.governance_applied
    ? 'sidebar_governance_runtime'
    : payload.module_access_governance?.engine
      ? 'module_access_governance_engine'
      : 'legacy_motor_a';

  return {
    sovereign_lock_applied: true,
    authority_chain_valid: chainValidation.valid,
    violations: chainValidation.violations,
    module_source: moduleSource,
    canonical_source: 'governed_visible_modules',
    reconciliation_active: reconciliationRuntime.isEnabled(),
    normalization_active: normRuntime.isEnabled(),
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  isEnabled,
  AUTHORITY_CHAIN,
  validateAuthorityChain,
  applySovereignLock
};
