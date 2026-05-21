'use strict';

const CANONICAL_PIPELINE_ORDER = Object.freeze([
  { order: 1, stage: 'identity', source: 'operationalIdentityGovernance' },
  { order: 2, stage: 'hierarchy', source: 'hierarchyAuthorityMapper' },
  { order: 3, stage: 'domain', source: 'domainResponsibilityResolver' },
  { order: 4, stage: 'authority', source: 'authorityModuleMatrix' },
  { order: 5, stage: 'legacy_modules', source: 'dashboardAccessService' },
  { order: 6, stage: 'contextual_modules', source: 'contextualModules' },
  { order: 7, stage: 'semantic_alignment', source: 'runtimeAlignment' },
  { order: 8, stage: 'precision_delivery', source: 'precisionRuntime' },
  { order: 9, stage: 'contextual_delivery', source: 'contextualDeliveryStabilization' },
  { order: 10, stage: 'contextual_enforcement_Z2', source: 'contextualActivation' },
  { order: 11, stage: 'pilot_runtime_Z3', source: 'pilotTenants' },
  { order: 12, stage: 'production_Z12', source: 'productionRuntimeActivation' },
  { order: 13, stage: 'real_enforcement_Z13', source: 'realTenantEnforcement' },
  { order: 14, stage: 'canonical_governance_Z14', source: 'canonicalModuleGovernance' },
  { order: 15, stage: 'contextual_merge_protection', source: 'preventLegacyModuleReinjection' },
  { order: 16, stage: 'final_visible_modules', source: 'dashboard_me_response' },
  { order: 90, stage: 'frontend_hybrid_menu', source: 'buildHybridMenu' },
  { order: 91, stage: 'frontend_publication_merge', source: 'safeMerge*Publication' },
  { order: 92, stage: 'frontend_sidebar_adapter', source: 'sidebarGovernanceAdapter' },
  { order: 93, stage: 'render', source: 'Layout.jsx' }
]);

function buildPipelineOrderTrace(actualStages = []) {
  const actualByStage = new Map(actualStages.map((s) => [s.stage, s]));
  const timeline = CANONICAL_PIPELINE_ORDER.map((row) => {
    const actual = actualByStage.get(row.stage);
    return {
      ...row,
      executed: !!actual,
      timestamp: actual?.timestamp || null,
      modules_after_count: actual?.modules_after?.length ?? null,
      leakage_detected: actual?.leakage_detected === true,
      governance_applied: actual?.governance_applied === true
    };
  });

  const executedOrders = actualStages.map((s) => s.execution_order).filter((n) => n > 0);
  const orderStable =
    executedOrders.length <= 1 ||
    executedOrders.every((v, i, arr) => i === 0 || v >= arr[i - 1]);

  return {
    canonical_order: CANONICAL_PIPELINE_ORDER,
    timeline,
    actual_stage_count: actualStages.length,
    order_stable: orderStable,
    stale_contextual_risk: actualStages.some(
      (s) => s.contextual_source && s.stage === 'contextual_modules' && s.execution_order > 14
    )
  };
}

module.exports = { CANONICAL_PIPELINE_ORDER, buildPipelineOrderTrace };
