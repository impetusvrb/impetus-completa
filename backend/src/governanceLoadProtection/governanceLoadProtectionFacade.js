'use strict';

const flags = require('../runtimeOperationalScaling/config/phaseZ11FeatureFlags');
const { analyzeGovernanceLoad } = require('./governanceLoadAnalyzer');
const { detectObservabilitySaturation } = require('./observabilitySaturationDetector');
const { detectRuntimeEntropy } = require('./runtimeEntropyProtection');
const { protectGovernancePressure } = require('./governancePressureProtection');

function assessGovernanceLoadProtection(tenantId, z10Pack = {}, ctx = {}) {
  const governance_load = analyzeGovernanceLoad(z10Pack, ctx);
  const observability = detectObservabilitySaturation(ctx);
  const entropy = detectRuntimeEntropy({
    scaling: ctx.scaling_stability,
    governance_load,
    observability
  });
  const protection = protectGovernancePressure(governance_load, entropy);

  return {
    phase: 'Z.11',
    tenant_id: tenantId,
    enabled: flags.isGovernanceLoadProtectionEnabled(),
    governance_load,
    observability,
    entropy,
    protection,
    governance_overload_detected: governance_load.overload,
    operational_entropy_detected: entropy.runtime_entropy_detected,
    recommendation_only: true,
    auto_remediate: false,
    graceful_degradation: true
  };
}

module.exports = { assessGovernanceLoadProtection };
