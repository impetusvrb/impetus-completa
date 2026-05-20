'use strict';

const phaseO = require('./config/phaseOFeatureFlags');
const { logPhaseO } = require('./phaseOLogger');

function superviseOperationalStability(ctx = {}) {
  const pressure = ctx.cognitive_operational_pressure ?? 0.25;
  const entropy = ctx.runtime_entropy_score ?? 0.12;
  const stable = pressure < 0.55 && entropy < 0.35;

  if (phaseO.isRuntimeStabilizationObservabilityEnabled()) {
    logPhaseO('STABILIZATION_SUPERVISION_TICK', {
      stable,
      pressure,
      shadow_only: !phaseO.isRuntimeStabilizationEnabled()
    });
  }

  return {
    stable,
    pressure,
    entropy,
    enforcement_active: phaseO.isRuntimeStabilizationEnabled(),
    shadow_only: !phaseO.isRuntimeStabilizationEnabled()
  };
}

module.exports = { superviseOperationalStability };
