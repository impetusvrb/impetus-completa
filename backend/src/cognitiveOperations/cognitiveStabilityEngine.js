'use strict';

const phaseN = require('./config/phaseNFeatureFlags');
const { recordStabilitySample, computeRuntimeStability } = require('./runtimeStabilityMonitor');
const { logPhaseN } = require('./phaseNLogger');

function assessCognitiveStability(signals = {}) {
  const consistency = signals.cognitive_consistency_score ?? 0.9;
  recordStabilitySample(consistency);
  const stability = computeRuntimeStability();
  const unstable = stability.runtime_stability < 0.72 || signals.composition_oscillation > 0.4;

  if (unstable && phaseN.isEnterpriseOperationsObservabilityEnabled()) {
    logPhaseN('RUNTIME_DEGRADATION_DETECTED', {
      runtime_stability: stability.runtime_stability,
      shadow_only: !phaseN.isCognitiveStabilityEngineEnabled()
    });
  }

  return {
    ...stability,
    unstable,
    enforcement_active: phaseN.isCognitiveStabilityEngineEnabled(),
    shadow_only: !phaseN.isCognitiveStabilityEngineEnabled()
  };
}

module.exports = { assessCognitiveStability };
