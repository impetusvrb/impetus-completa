'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isGovernanceBootstrapActive: () => _flag('IMPETUS_GOVERNANCE_BOOTSTRAP_ACTIVE', false),
  isGlobalShadowObservationEnabled: () =>
    _flag('IMPETUS_GLOBAL_SHADOW_OBSERVATION', false) || _flag('IMPETUS_GOVERNANCE_BOOTSTRAP_ACTIVE', false),
  isSoftKpiRolloutEnabled: () => _flag('IMPETUS_SOFT_KPI_GOVERNANCE_ROLLOUT', false)
};
