'use strict';

const phaseN = require('./config/phaseNFeatureFlags');
const { logPhaseN } = require('./phaseNLogger');

function detectCognitiveEntropy(signals = {}) {
  const fallbackRate = signals.fallback_rate ?? 0;
  const fragmentation = signals.cognitive_fragmentation_rate ?? 0;
  const inconsistency = 1 - (signals.cognitive_consistency_score ?? 0.9);
  const entropy = Number(
    Math.min(1, fallbackRate * 0.35 + fragmentation * 0.35 + inconsistency * 0.3).toFixed(4)
  );

  const detected = entropy > 0.35;
  if (detected && (phaseN.isRuntimeEntropyDetectionEnabled() || phaseN.isEnterpriseOperationsObservabilityEnabled())) {
    logPhaseN('COGNITIVE_ENTROPY_DETECTED', { entropy, shadow_only: !phaseN.isRuntimeEntropyDetectionEnabled() });
  }

  return {
    runtime_entropy_score: entropy,
    entropy_detected: detected,
    enforcement_active: phaseN.isRuntimeEntropyDetectionEnabled(),
    shadow_only: !phaseN.isRuntimeEntropyDetectionEnabled()
  };
}

module.exports = { detectCognitiveEntropy };
