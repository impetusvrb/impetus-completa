'use strict';

const phaseN = require('./config/phaseNFeatureFlags');

function computeDynamicConfidence(signals = {}) {
  let base = 0.88;
  if (signals.drift_detected) base -= 0.12;
  if (signals.entropy > 0.35) base -= 0.1;
  if (signals.fallback_rate > 0.2) base -= 0.08;
  if (signals.runtime_stability < 0.7) base -= 0.1;
  base += (signals.truth_integrity ?? 0.88) * 0.05;

  const runtime_confidence = Number(Math.max(0.2, Math.min(1, base)).toFixed(4));
  const contextual_confidence = Number(
    Math.max(0.2, Math.min(1, runtime_confidence * (signals.contextual_integrity ?? 0.86))).toFixed(4)
  );
  const governance_confidence = Number(
    Math.max(0.2, Math.min(1, runtime_confidence * (signals.governance_operational_health ?? 0.84))).toFixed(4)
  );
  const operational_confidence = Number(
    ((runtime_confidence + contextual_confidence + governance_confidence) / 3).toFixed(4)
  );

  return {
    runtime_confidence,
    contextual_confidence,
    governance_confidence,
    operational_confidence,
    dynamic: phaseN.isDynamicConfidenceEngineEnabled(),
    shadow_only: !phaseN.isDynamicConfidenceEngineEnabled()
  };
}

module.exports = { computeDynamicConfidence };
