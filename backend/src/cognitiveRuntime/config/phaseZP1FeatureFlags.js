'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (['on', 'shadow', 'active'].includes(v)) return v;
  return 'off';
}

module.exports = {
  productionLiveValidationMode: () => _mode('IMPETUS_PRODUCTION_LIVE_VALIDATION', 'off'),
  isProductionLiveValidationEnabled: () => {
    const m = _mode('IMPETUS_PRODUCTION_LIVE_VALIDATION', 'off');
    return m === 'shadow' || m === 'on' || m === 'active';
  },
  isTelemetryGovernanceEnabled: () => _flag('IMPETUS_TELEMETRY_GOVERNANCE', true),
  isIndustrialRuntimeHealthEnabled: () => _flag('IMPETUS_INDUSTRIAL_RUNTIME_HEALTH', true),
  isProductionOverloadProtectionEnabled: () => _flag('IMPETUS_PRODUCTION_OVERLOAD_PROTECTION', true),
  isProductionPerformanceObservabilityEnabled: () => _flag('IMPETUS_PRODUCTION_PERFORMANCE_OBSERVABILITY', true),
  deliveryMutation: false
};
