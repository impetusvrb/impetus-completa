'use strict';

const _m = {
  rollout_health: 0.86,
  activation_stability: 0.88,
  contextual_delivery_accuracy: 0.89,
  hierarchy_accuracy: 0.9,
  module_delivery_accuracy: 0.91,
  KPI_delivery_accuracy: 0.88,
  summary_delivery_accuracy: 0.87,
  runtime_activation_confidence: 0.86,
  samples: 0
};

function recordActivationSample(sample = {}) {
  _m.samples += 1;
  const w = 1 / Math.min(_m.samples, 100);
  for (const k of Object.keys(_m)) {
    if (k === 'samples') continue;
    if (sample[k] != null) _m[k] = Number((_m[k] * (1 - w) + sample[k] * w).toFixed(4));
  }
}

function getActivationTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetActivationTelemetry() {
  _m.samples = 0;
}

module.exports = { recordActivationSample, getActivationTelemetry, resetActivationTelemetry };
