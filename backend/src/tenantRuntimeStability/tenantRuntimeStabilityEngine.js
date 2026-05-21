'use strict';

const flags = require('../runtimeGovernanceConsolidation/config/phaseZ10FeatureFlags');
const { detectTenantOscillation } = require('./tenantOscillationDetector');
const { measureTenantGovernancePressure } = require('./tenantGovernancePressure');
const { assessTenantRuntimeFatigue } = require('./tenantRuntimeFatigue');

function runTenantRuntimeStabilityEngine(tenantId, ctx = {}) {
  const oscillation = detectTenantOscillation(tenantId, ctx);
  const pressure = measureTenantGovernancePressure(tenantId);
  const fatigue = assessTenantRuntimeFatigue(ctx);
  const unstable = oscillation.oscillating || pressure.overload || fatigue.fatigued;

  const issues = [];
  if (oscillation.oscillating) issues.push('oscillation');
  if (pressure.overload) issues.push('governance_overload');
  if (fatigue.fatigued) issues.push('runtime_fatigue');
  if (ctx.operational_degradation) issues.push('operational_degradation');

  return {
    phase: 'Z.10',
    tenant_id: tenantId,
    enabled: flags.isTenantGovernanceMaturityEnabled(),
    oscillation,
    pressure,
    fatigue,
    unstable,
    issues,
    stability_score: Math.max(0, 1 - issues.length * 0.2),
    recommendation_only: true,
    auto_remediate: false
  };
}

module.exports = { runTenantRuntimeStabilityEngine };
