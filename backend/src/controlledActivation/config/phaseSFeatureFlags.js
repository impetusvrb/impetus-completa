'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isControlledRuntimeActivationEnabled: () => _flag('IMPETUS_CONTROLLED_RUNTIME_ACTIVATION', false),
  isProductionChannelGovernanceEnabled: () => _flag('IMPETUS_PRODUCTION_CHANNEL_GOVERNANCE', false),
  isRuntimeDeliveryValidationEnabled: () => _flag('IMPETUS_RUNTIME_DELIVERY_VALIDATION', false),
  isRuntimeStabilizationMonitorEnabled: () => _flag('IMPETUS_RUNTIME_STABILIZATION_MONITOR', false),
  isControlledActivationObservabilityEnabled: () => _flag('IMPETUS_CONTROLLED_ACTIVATION_OBSERVABILITY', true)
};
