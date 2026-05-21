'use strict';

const flags = require('./config/phaseZ1FeatureFlags');
const { buildCanonicalDeliveryMatrix } = require('./canonicalDeliveryMatrix');
const { buildGovernedModuleAuthorityMap } = require('./governedModuleAuthorityMap');
const { buildHierarchicalVisibilityMatrix } = require('./hierarchicalVisibilityMatrix');
const { buildDomainBoundaryMatrix } = require('./domainBoundaryMatrix');
const { buildOperationalScopeMatrix } = require('./operationalScopeMatrix');
const { validateContextualMenuTargeting } = require('./contextualMenuTargetingValidator');
const { computeRuntimeVisibilityReadiness } = require('./runtimeVisibilityReadiness');
const { computeHierarchyDeliveryReadiness } = require('./hierarchyDeliveryReadiness');
const { resolveDeliveryConflicts } = require('./deliveryConflictResolver');
const { adviseSafeContextualPruning } = require('./safeContextualPruningAdvisor');
const { simulateShadowModulePruning } = require('./shadowModulePruningSimulation');
const { planContextualGracefulDegradation } = require('./contextualGracefulDegradation');
const { simulateLowDensityDeliveryReduction } = require('./lowDensityDeliveryReducer');

function _resolveIdentity(user, ctx) {
  try {
    const id = require('../operationalIdentity/operationalIdentityFacade');
    return id.resolveIdentityForUser(user, ctx);
  } catch {
    return {
      canonical_identity: {
        tenant_id: user?.company_id,
        domain_axis: ctx.functional_axis,
        hierarchy_level: 3,
        profile_code: ctx.profile_code
      },
      domain_authority: {}
    };
  }
}

function getContextualEnforcementStatus(ctx = {}) {
  return {
    phase: 'Z.1',
    layer: 'contextual-enforcement-preparation',
    preparation: flags.isContextualEnforcementPreparationEnabled(),
    canonical_matrix: flags.isCanonicalDeliveryMatrixEnabled(),
    observability: flags.isContextualEnforcementObservabilityEnabled(),
    pruning_simulation: flags.isContextualPruningSimulationEnabled(),
    enforcement_applied: false,
    recommendation_only: true,
    tenant_id: ctx.tenant_id
  };
}

function prepareContextualEnforcement(user, ctx = {}) {
  const identityPack = _resolveIdentity(user, ctx);
  const identity = identityPack.canonical_identity;
  const matrix = buildCanonicalDeliveryMatrix(identity, ctx);
  const authorityMap = buildGovernedModuleAuthorityMap(matrix, identityPack.domain_authority || identityPack.authority_registry);
  const hierarchyMatrix = buildHierarchicalVisibilityMatrix(identity);
  const domainBoundary = buildDomainBoundaryMatrix(identity);
  const scopeMatrix = buildOperationalScopeMatrix(identity, ctx);

  let tenantReady = { enforcement_ready: true };
  try {
    tenantReady = require('../tenantProfiling/tenantProfileFacade').assessTenantDeliveryReadiness(
      identity.tenant_id,
      identity,
      ctx
    );
  } catch {
    tenantReady = { enforcement_ready: identity.inference_complete !== false };
  }

  const targeting = validateContextualMenuTargeting(matrix, ctx);
  const hierarchy = computeHierarchyDeliveryReadiness(identity, ctx);
  const visibility = computeRuntimeVisibilityReadiness(matrix, targeting, tenantReady);
  const conflicts = resolveDeliveryConflicts(matrix, targeting, hierarchy);
  const pruning = adviseSafeContextualPruning(matrix, ctx);
  const simulation = simulateShadowModulePruning(matrix, { ...ctx, force_simulation: true });
  const degradation = planContextualGracefulDegradation(ctx);
  const densityReduction = simulateLowDensityDeliveryReduction(ctx);

  return {
    status: getContextualEnforcementStatus(ctx),
    matrix,
    authority_map: authorityMap,
    hierarchy_matrix: hierarchyMatrix,
    domain_boundary: domainBoundary,
    scope_matrix: scopeMatrix,
    targeting,
    hierarchy,
    visibility,
    conflicts,
    pruning,
    pruning_simulation: simulation,
    degradation,
    density_reduction: densityReduction,
    tenant_readiness: tenantReady,
    enforcement_applied: false,
    auto_execute: false
  };
}

function getContextualEnforcementReport(user, ctx = {}) {
  const prep = prepareContextualEnforcement(user, ctx);
  return { ok: true, ...prep, auto_hide: false, auto_remove: false };
}

module.exports = {
  getContextualEnforcementStatus,
  prepareContextualEnforcement,
  getContextualEnforcementReport,
  buildCanonicalDeliveryMatrix,
  validateContextualMenuTargeting,
  computeRuntimeVisibilityReadiness,
  simulateShadowModulePruning
};
