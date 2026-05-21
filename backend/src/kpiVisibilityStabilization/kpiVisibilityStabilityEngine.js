'use strict';

const flags = require('../kpiRuntimeStability/config/phaseZ6FeatureFlags');
const { logPhaseZ6 } = require('../kpiRuntimeStability/phaseZ6Logger');
const { detectKpiVisibilityOscillation } = require('./kpiVisibilityOscillationDetector');
const { balanceHierarchyVisibility } = require('./hierarchyVisibilityBalancer');
const { assessContextualKpiConsistency } = require('./contextualKpiConsistencyRuntime');
const { adviseKpiVisibilityRecovery } = require('./kpiVisibilityRecoveryAdvisor');

function runKpiVisibilityStabilityEngine(kpis = [], user = {}, ctx = {}) {
  const before = ctx.kpis_before || kpis;
  const oscillation = detectKpiVisibilityOscillation(before, kpis, ctx);
  const hierarchy = balanceHierarchyVisibility(kpis, user, ctx);
  const consistency = assessContextualKpiConsistency(user, hierarchy.kpis, ctx);
  const recovery = adviseKpiVisibilityRecovery(hierarchy.kpis, {
    ...ctx,
    oscillation,
    critical_underdelivery: ctx.critical_underdelivery
  });

  let stabilized = hierarchy.kpis;
  if (flags.isKpiVisibilityStabilizationEnabled() && oscillation.oscillation_detected) {
    stabilized = before.filter((k) => hierarchy.kpis.some((h) => require('../kpiRuntimeEnforcement/domainKpiIsolation').kpiKey(h) === require('../kpiRuntimeEnforcement/domainKpiIsolation').kpiKey(k)));
    if (!stabilized.length) stabilized = hierarchy.kpis;
  }

  if (!oscillation.stable && flags.isKpiRuntimeStabilityObservabilityEnabled()) {
    logPhaseZ6('KPI_VISIBILITY_UNSTABLE', {
      tenant_id: ctx.tenant_id,
      shadow_only: !flags.isKpiVisibilityStabilizationEnabled()
    });
  }

  return {
    stabilized_kpis: stabilized,
    oscillation,
    hierarchy,
    consistency,
    recovery,
    visibility_stable: oscillation.stable && consistency.consistent,
    recommendation_only: !flags.isKpiVisibilityStabilizationEnabled()
  };
}

module.exports = { runKpiVisibilityStabilityEngine };
