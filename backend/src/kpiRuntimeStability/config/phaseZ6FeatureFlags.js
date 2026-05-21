'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isKpiVisibilityStabilizationEnabled: () => _flag('IMPETUS_KPI_VISIBILITY_STABILIZATION', false),
  isKpiUnderdeliveryHardeningEnabled: () => _flag('IMPETUS_KPI_UNDERDELIVERY_HARDENING', false),
  isKpiTargetingHardeningEnabled: () => _flag('IMPETUS_KPI_TARGETING_HARDENING', false),
  isKpiDashboardStabilizationEnabled: () => _flag('IMPETUS_KPI_DASHBOARD_STABILIZATION', false),
  isKpiRuntimeStabilityObservabilityEnabled: () => _flag('IMPETUS_KPI_RUNTIME_STABILITY_OBSERVABILITY', true)
};
