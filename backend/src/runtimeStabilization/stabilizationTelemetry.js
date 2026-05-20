'use strict';

const _m = {
  stabilization_score: 0.86,
  runtime_simplicity_score: 0.82,
  governance_efficiency: 0.84,
  orchestration_efficiency: 0.85,
  cognitive_runtime_pressure: 0.28,
  observability_pressure: 0.22,
  runtime_sustainability: 0.87,
  samples: 0
};

function recordStabilizationSample(sample = {}) {
  _m.samples += 1;
  const w = 1 / Math.min(_m.samples, 100);
  for (const k of Object.keys(_m)) {
    if (k === 'samples') continue;
    if (sample[k] != null) _m[k] = Number((_m[k] * (1 - w) + sample[k] * w).toFixed(4));
  }
}

function getStabilizationTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetStabilizationTelemetry() {
  _m.samples = 0;
  _m.cognitive_runtime_pressure = 0.28;
  _m.observability_pressure = 0.22;
}

module.exports = { recordStabilizationSample, getStabilizationTelemetry, resetStabilizationTelemetry };
