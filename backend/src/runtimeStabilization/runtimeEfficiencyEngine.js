'use strict';

const phaseO = require('./config/phaseOFeatureFlags');

function computeRuntimeEfficiency(signals = {}) {
  const layers = signals.active_layers ?? 3;
  const observability = signals.observability_blocks ?? 3;
  const overhead = Number(Math.min(1, layers * 0.08 + observability * 0.06).toFixed(4));
  const runtime_efficiency = Number(Math.max(0.2, 1 - overhead).toFixed(4));

  return {
    runtime_efficiency,
    cognitive_overhead: overhead,
    orchestration_complexity: Number((layers / 6).toFixed(4)),
    governance_cost: Number((layers * 0.05).toFixed(4)),
    observability_cost: Number((observability * 0.04).toFixed(4)),
    runtime_processing_pressure: Number((overhead * 0.9).toFixed(4)),
    enforcement_active: phaseO.isRuntimeEfficiencyEngineEnabled(),
    shadow_only: !phaseO.isRuntimeEfficiencyEngineEnabled()
  };
}

module.exports = { computeRuntimeEfficiency };
