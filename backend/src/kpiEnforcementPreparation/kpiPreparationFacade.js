'use strict';

const flags = require('../pilotMaturity/config/phaseZ4FeatureFlags');
const { simulateKpiVisibility } = require('./kpiVisibilityPreparation');
const { validateKpiContextualAuthority } = require('./kpiContextualAuthorityValidator');
const { validateKpiHierarchyIsolation } = require('./kpiHierarchyIsolationValidator');
const { analyzeKpiUnderdeliveryRisk } = require('./kpiUnderdeliveryRiskAnalyzer');
const { assessKpiTargetingReadiness } = require('./kpiTargetingReadiness');
const { extractKpiList } = require('../kpiRollout/kpiTargetingValidator');

function getKpiPreparationStatus(ctx = {}) {
  return {
    phase: 'Z.4',
    layer: 'kpi-enforcement-preparation',
    preparation: flags.isKpiEnforcementPreparationEnabled(),
    kpi_enforcement_applied: false,
    simulation_only: true,
    recommendation_only: true,
    tenant_id: ctx.tenant_id
  };
}

function prepareKpiEnforcement(user = {}, kpiPayload = {}, ctx = {}) {
  const kpis = extractKpiList(kpiPayload);
  const identity = ctx.canonical_identity || {};
  const simCtx = {
    ...ctx,
    domain_axis: identity.domain_axis,
    hierarchy_tier: identity.hierarchy_tier,
    functional_axis: identity.domain_axis
  };

  const visibility = simulateKpiVisibility(kpis, simCtx);
  const authority = validateKpiContextualAuthority(user, kpis, simCtx);
  const hierarchy = validateKpiHierarchyIsolation(user, kpis, simCtx);
  const underdelivery = analyzeKpiUnderdeliveryRisk(kpis, {
    ...simCtx,
    simulated_visible_count: visibility.preserve_count
  });
  const readiness = assessKpiTargetingReadiness(ctx.maturity || {}, visibility, ctx);

  return {
    status: getKpiPreparationStatus(ctx),
    visibility_simulation: visibility,
    authority,
    hierarchy,
    underdelivery,
    readiness,
    leakage_detected: visibility.would_hide.some((h) => h.reason === 'cross_domain'),
    enforcement_applied: false,
    payload_unchanged: true
  };
}

module.exports = { getKpiPreparationStatus, prepareKpiEnforcement };
