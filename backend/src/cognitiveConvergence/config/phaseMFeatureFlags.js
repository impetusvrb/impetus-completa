'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isUnifiedCognitiveContextEnabled: () => _flag('IMPETUS_UNIFIED_COGNITIVE_CONTEXT', false),
  isRuntimeTruthAuthorityEnabled: () => _flag('IMPETUS_RUNTIME_TRUTH_AUTHORITY', false),
  isGovernedAiOrchestrationEnabled: () => _flag('IMPETUS_GOVERNED_AI_ORCHESTRATION', false),
  isCognitiveConsistencyValidationEnabled: () => _flag('IMPETUS_COGNITIVE_CONSISTENCY_VALIDATION', false),
  isContextDriftDetectionEnabled: () => _flag('IMPETUS_CONTEXT_DRIFT_DETECTION', false),
  isCognitiveConvergenceObservabilityEnabled: () => _flag('IMPETUS_COGNITIVE_CONVERGENCE_OBSERVABILITY', true)
};
