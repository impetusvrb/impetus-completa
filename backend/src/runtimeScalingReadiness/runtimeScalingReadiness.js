'use strict';

const flags = require('../runtimeOperationalScaling/config/phaseZ11FeatureFlags');

function computeRuntimeScalingReadiness(tenantId, pack = {}) {
  const validator = pack.validator || {};
  const health = pack.health || {};
  const expansion = pack.expansion || {};
  const sustainable = pack.z10?.runtime_sustainability?.governance?.governance_sustainable !== false;

  const ready =
    validator.scaling_safe === true &&
    health.continuous_ready === true &&
    sustainable &&
    expansion.classification?.expansion_blocked !== true;

  return {
    phase: 'Z.11',
    tenant_id: tenantId,
    enabled: flags.isRuntimeScalingReadinessEnabled(),
    scaling_ready: ready,
    scaling_safe: validator.scaling_safe === true,
    continuous_readiness: health.continuous_ready,
    governance_sustainable: sustainable,
    auto_expand: false,
    recommendation_only: true
  };
}

module.exports = { computeRuntimeScalingReadiness };
