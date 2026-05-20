'use strict';

const { logPhaseN } = require('./phaseNLogger');
const phaseN = require('./config/phaseNFeatureFlags');

function detectGovernanceDegradation(signals = {}) {
  const effectiveness = signals.governance_effectiveness_score ?? 0.85;
  const fatigue = signals.governance_fatigue ?? 0;
  const degraded = effectiveness < 0.65 || fatigue > 0.5;

  if (degraded && phaseN.isEnterpriseOperationsObservabilityEnabled()) {
    logPhaseN('GOVERNANCE_DEGRADATION_DETECTED', { effectiveness, fatigue, shadow_only: true });
  }

  return {
    governance_degradation_detected: degraded,
    governance_effectiveness_score: Number(effectiveness.toFixed(4)),
    governance_fatigue: Number(fatigue.toFixed(4))
  };
}

module.exports = { detectGovernanceDegradation };
