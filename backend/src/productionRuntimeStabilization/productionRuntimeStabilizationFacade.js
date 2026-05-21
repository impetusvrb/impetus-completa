'use strict';

const flags = require('../productionRuntimeActivation/config/phaseZ12FeatureFlags');
const { stabilizeProductionRuntime } = require('./productionRuntimeStabilizer');
const { stabilizeRuntimeEntropy } = require('./runtimeEntropyStabilizer');
const { stabilizeGovernancePressure } = require('./governancePressureStabilizer');
const { assessRolloutOperationalStability } = require('./rolloutOperationalStability');

function applyProductionRuntimeStabilization(tenantId, pack = {}) {
  const runtime = stabilizeProductionRuntime(pack);
  const entropy = stabilizeRuntimeEntropy(pack.governance_load_protection?.entropy || pack.entropy || {});
  const pressure = stabilizeGovernancePressure(pack.governance_load_protection || {});
  const rollout = assessRolloutOperationalStability(pack);

  return {
    phase: 'Z.12',
    tenant_id: tenantId,
    enabled: flags.isRuntimeStabilizationEnabled(),
    runtime,
    entropy,
    pressure,
    rollout,
    operational_stable: rollout.rollout_stable && entropy.entropy_controlled && pressure.pressure_controlled,
    payload_unchanged: true,
    auto_remediate: false
  };
}

module.exports = { applyProductionRuntimeStabilization };
