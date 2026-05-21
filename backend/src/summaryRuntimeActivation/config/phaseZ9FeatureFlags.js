'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isSummaryRuntimeActivationEnabled: () => _flag('IMPETUS_SUMMARY_RUNTIME_ACTIVATION', false),
  isTenantSummaryEnforcementEnabled: () => _flag('IMPETUS_TENANT_SUMMARY_ENFORCEMENT', false),
  isSummaryNarrativeStabilizationEnabled: () => _flag('IMPETUS_SUMMARY_NARRATIVE_STABILIZATION', false),
  isSummaryTargetingHardeningEnabled: () => _flag('IMPETUS_SUMMARY_TARGETING_HARDENING', false),
  isSummaryDeliveryQualityEnabled: () => _flag('IMPETUS_SUMMARY_DELIVERY_QUALITY', false),
  isSummaryRuntimeObservabilityEnabled: () => _flag('IMPETUS_SUMMARY_RUNTIME_OBSERVABILITY', true)
};
