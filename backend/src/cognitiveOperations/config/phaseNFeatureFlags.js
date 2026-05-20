'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isEnterpriseCognitiveOperationsEnabled: () => _flag('IMPETUS_ENTERPRISE_COGNITIVE_OPERATIONS', false),
  isRuntimeEntropyDetectionEnabled: () => _flag('IMPETUS_RUNTIME_ENTROPY_DETECTION', false),
  isDynamicConfidenceEngineEnabled: () => _flag('IMPETUS_DYNAMIC_CONFIDENCE_ENGINE', false),
  isCognitiveStabilityEngineEnabled: () => _flag('IMPETUS_COGNITIVE_STABILITY_ENGINE', false),
  isGovernanceCalibrationEnabled: () => _flag('IMPETUS_GOVERNANCE_CALIBRATION', false),
  isEnterpriseOperationsObservabilityEnabled: () => _flag('IMPETUS_ENTERPRISE_OPERATIONS_OBSERVABILITY', true)
};
