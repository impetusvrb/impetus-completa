'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isTenantCognitiveRolloutEnabled: () => _flag('IMPETUS_TENANT_COGNITIVE_ROLLOUT', false),
  isTenantRolloutActivationEnabled: () => _flag('IMPETUS_TENANT_ROLLOUT_ACTIVATION', false),
  isTenantRolloutObservabilityEnabled: () => _flag('IMPETUS_TENANT_ROLLOUT_OBSERVABILITY', true)
};
