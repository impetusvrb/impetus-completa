'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isRuntimeStabilizationEnabled: () => _flag('IMPETUS_RUNTIME_STABILIZATION', false),
  isGovernanceFatigueDetectionEnabled: () => _flag('IMPETUS_GOVERNANCE_FATIGUE_DETECTION', false),
  isPipelineRedundancyAnalysisEnabled: () => _flag('IMPETUS_PIPELINE_REDUNDANCY_ANALYSIS', false),
  isRuntimeEfficiencyEngineEnabled: () => _flag('IMPETUS_RUNTIME_EFFICIENCY_ENGINE', false),
  isShadowOptimizationEnabled: () => _flag('IMPETUS_SHADOW_OPTIMIZATION', false),
  isRuntimeStabilizationObservabilityEnabled: () => _flag('IMPETUS_RUNTIME_STABILIZATION_OBSERVABILITY', true)
};
