'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isProductionRuntimeActivationEnabled: () => _flag('IMPETUS_PRODUCTION_RUNTIME_ACTIVATION', false),
  isRuntimeStabilizationEnabled: () => _flag('IMPETUS_RUNTIME_STABILIZATION', false),
  isRuntimeActivationSafetyEnabled: () => _flag('IMPETUS_RUNTIME_ACTIVATION_SAFETY', false),
  isPilotHealthSupervisionEnabled: () => _flag('IMPETUS_PILOT_HEALTH_SUPERVISION', false),
  isRuntimeObservationConsolidationEnabled: () => _flag('IMPETUS_RUNTIME_OBSERVATION_CONSOLIDATION', true)
};
