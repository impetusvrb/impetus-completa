'use strict';

const flags = require('./config/phaseZ11FeatureFlags');
const { detectScalingOscillation } = require('./scalingOscillationDetector');
const { measureGovernanceScalingPressure } = require('./governanceScalingPressure');
const { assessRuntimeScalingIntegrity } = require('./runtimeScalingIntegrity');

function runRuntimeScalingStability(tenantId, z10Pack = {}, ctx = {}) {
  const oscillation = detectScalingOscillation({
    ...ctx,
    tenant_stability: z10Pack.consolidation?.stability
  });
  const pressure = measureGovernanceScalingPressure(z10Pack, ctx);
  const integrity = assessRuntimeScalingIntegrity(oscillation, pressure);
  const unstable = oscillation.scaling_unstable || pressure.governance_overload;

  return {
    phase: 'Z.11',
    tenant_id: tenantId,
    enabled: flags.isRuntimeExpansionControlEnabled(),
    oscillation,
    pressure,
    integrity,
    scaling_instability_detected: unstable,
    scaling_degradation: unstable,
    recommendation_only: true,
    auto_scale: false
  };
}

module.exports = { runRuntimeScalingStability };
