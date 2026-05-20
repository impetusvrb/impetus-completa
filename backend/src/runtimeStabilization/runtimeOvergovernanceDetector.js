'use strict';

const { logPhaseO } = require('./phaseOLogger');
const phaseO = require('./config/phaseOFeatureFlags');

function detectOvergovernance(signals = {}) {
  const validators = signals.validator_count ?? signals.active_layers ?? 3;
  const over = validators > 5;
  if (over && phaseO.isRuntimeStabilizationObservabilityEnabled()) {
    logPhaseO('RUNTIME_OVERGOVERNANCE_DETECTED', { validators, shadow_only: true });
  }
  return { overgovernance_detected: over, validator_count: validators };
}

module.exports = { detectOvergovernance };
