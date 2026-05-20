'use strict';

const phaseO = require('./config/phaseOFeatureFlags');
const { logPhaseO } = require('./phaseOLogger');

function detectGovernanceFatigue(signals = {}) {
  const layerCount = signals.active_layers ?? 3;
  const pressure = signals.cognitive_operational_pressure ?? 0.25;
  const fatigue = Number(Math.min(1, layerCount * 0.12 + pressure * 0.5).toFixed(4));
  const detected = fatigue > 0.55;

  if (detected && (phaseO.isGovernanceFatigueDetectionEnabled() || phaseO.isRuntimeStabilizationObservabilityEnabled())) {
    logPhaseO('GOVERNANCE_FATIGUE_DETECTED', { fatigue, layerCount, shadow_only: !phaseO.isGovernanceFatigueDetectionEnabled() });
  }

  return { governance_fatigue: fatigue, fatigue_detected: detected, shadow_only: !phaseO.isGovernanceFatigueDetectionEnabled() };
}

module.exports = { detectGovernanceFatigue };
