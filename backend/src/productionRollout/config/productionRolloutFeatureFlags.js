'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isProductionRolloutEnabled: () => _flag('IMPETUS_PRODUCTION_ROLLOUT', false),
  isGovernanceStabilizationEnabled: () => _flag('IMPETUS_GOVERNANCE_STABILIZATION', false),
  isRuntimeObservationEnabled: () => _flag('IMPETUS_RUNTIME_OBSERVATION', false)
};
