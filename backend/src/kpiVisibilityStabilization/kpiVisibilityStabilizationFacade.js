'use strict';

const flags = require('../kpiRuntimeStability/config/phaseZ6FeatureFlags');
const { runKpiVisibilityStabilityEngine } = require('./kpiVisibilityStabilityEngine');

function getKpiVisibilityStabilizationStatus(ctx = {}) {
  return {
    phase: 'Z.6',
    layer: 'kpi-visibility-stabilization',
    stabilization: flags.isKpiVisibilityStabilizationEnabled(),
    observability: flags.isKpiRuntimeStabilityObservabilityEnabled(),
    tenant_id: ctx.tenant_id
  };
}

function stabilizeKpiVisibility(user, kpis = [], ctx = {}) {
  const engine = runKpiVisibilityStabilityEngine(kpis, user, ctx);
  return {
    status: getKpiVisibilityStabilizationStatus(ctx),
    ...engine,
    enforcement_applied: flags.isKpiVisibilityStabilizationEnabled() && engine.visibility_stable === false,
    fabricated: false
  };
}

module.exports = { getKpiVisibilityStabilizationStatus, stabilizeKpiVisibility };
