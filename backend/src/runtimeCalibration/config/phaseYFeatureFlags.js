'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isRuntimeCalibrationEnabled: () => _flag('IMPETUS_RUNTIME_CALIBRATION', false),
  isTenantStabilizationEnabled: () => _flag('IMPETUS_TENANT_STABILIZATION', false),
  isRuntimeTuningAdvisorEnabled: () => _flag('IMPETUS_RUNTIME_TUNING_ADVISOR', false),
  isPipelineConsolidationAnalysisEnabled: () => _flag('IMPETUS_PIPELINE_CONSOLIDATION_ANALYSIS', false),
  isRuntimeCalibrationObservabilityEnabled: () => _flag('IMPETUS_RUNTIME_CALIBRATION_OBSERVABILITY', true)
};
