'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

module.exports = {
  isRuntimeDeliveryAuditEnabled: () => _flag('IMPETUS_RUNTIME_DELIVERY_AUDIT', false),
  isRuntimePipelineTraceEnabled: () => _flag('IMPETUS_RUNTIME_PIPELINE_TRACE', false),
  isLegacyInjectionAuditEnabled: () => _flag('IMPETUS_LEGACY_INJECTION_AUDIT', false),
  isFrontendGovernanceAuditEnabled: () => _flag('IMPETUS_FRONTEND_GOVERNANCE_AUDIT', false),
  isRuntimeDeliveryObservabilityEnabled: () => _flag('IMPETUS_RUNTIME_DELIVERY_OBSERVABILITY', true),
  isDeliveryHardeningEnabled: () =>
    _flag('IMPETUS_RUNTIME_DELIVERY_OBSERVABILITY', true) && _flag('IMPETUS_LEGACY_MODULE_PROTECTION', false) === false
      ? _flag('IMPETUS_RUNTIME_DELIVERY_OBSERVABILITY', true)
      : false,
  autoRemediation: false
};
