'use strict';

const { logPhaseO } = require('./phaseOLogger');
const phaseO = require('./config/phaseOFeatureFlags');

function detectObservabilitySaturation(signals = {}) {
  const blocks = signals.observability_blocks ?? 0;
  const saturated = blocks >= 4;
  if (saturated && phaseO.isRuntimeStabilizationObservabilityEnabled()) {
    logPhaseO('OBSERVABILITY_SATURATION_DETECTED', { blocks, shadow_only: true });
  }
  return {
    observability_saturation: saturated,
    observability_blocks: blocks,
    observability_pressure: Number(Math.min(1, blocks * 0.22).toFixed(4))
  };
}

module.exports = { detectObservabilitySaturation };
