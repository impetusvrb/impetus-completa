'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isKpiGovernanceRolloutEnabled: () => _flag('IMPETUS_KPI_GOVERNANCE_ROLLOUT', false),
  isKpiTargetingValidationEnabled: () => _flag('IMPETUS_KPI_TARGETING_VALIDATION', false),
  isKpiPrecisionRuntimeEnabled: () => _flag('IMPETUS_KPI_PRECISION_RUNTIME', false),
  isKpiDeliveryStabilizationEnabled: () => _flag('IMPETUS_KPI_DELIVERY_STABILIZATION', false),
  isKpiGovernanceObservabilityEnabled: () => _flag('IMPETUS_KPI_GOVERNANCE_OBSERVABILITY', true),
  /** Canal legacy (Phase I / produção) — activação manual via PM2 */
  isKpiGovernanceChannelEnabled: () => _flag('IMPETUS_KPI_GOVERNANCE', false)
};
