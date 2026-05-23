'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (['on', 'shadow', 'controlled', 'active'].includes(v)) return v;
  return 'off';
}

module.exports = {
  adaptiveOrchestrationMode: () => _mode('IMPETUS_ADAPTIVE_ORCHESTRATION', 'off'),
  isAdaptiveOrchestrationEnabled: () => {
    const m = _mode('IMPETUS_ADAPTIVE_ORCHESTRATION', 'off');
    return m === 'shadow' || m === 'on' || m === 'active' || m === 'controlled';
  },
  isAdaptiveOrchestrationShadow: () => _mode('IMPETUS_ADAPTIVE_ORCHESTRATION', 'off') === 'shadow',
  isCognitiveFatigueAnalysisEnabled: () => _flag('IMPETUS_COGNITIVE_FATIGUE_ANALYSIS', true),
  isAdaptiveDensityRuntimeEnabled: () => _flag('IMPETUS_ADAPTIVE_DENSITY_RUNTIME', true),
  isUsefulnessOrchestrationEnabled: () => _flag('IMPETUS_USEFULNESS_ORCHESTRATION', true),
  isOrchestrationObservabilityEnabled: () => _flag('IMPETUS_ORCHESTRATION_OBSERVABILITY', true),
  autoMutationAllowed: false,
  autoRemediation: false,
  autoDecision: false
};
