'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

module.exports = {
  isCognitiveConsolidationFreezeActive: () => _flag('IMPETUS_COGNITIVE_CONSOLIDATION_FREEZE', true),
  isCognitiveAuthorityAuditEnabled: () => _flag('IMPETUS_COGNITIVE_AUTHORITY_AUDIT', true),
  isCognitiveAuthorityObservabilityEnabled: () => _flag('IMPETUS_COGNITIVE_AUTHORITY_OBSERVABILITY', true),
  officialRuntimeId: () => 'runtime_z',
  fallbackRuntimeId: () => 'motor_a',
  engineV2Status: () => String(process.env.IMPETUS_ENGINE_V2_RETIREMENT_AUDIT || 'candidate_retirement').toLowerCase()
};
