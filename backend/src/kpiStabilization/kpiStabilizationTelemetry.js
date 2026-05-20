'use strict';

const _m = {
  delivery_precision_score: 0.87,
  contextual_alignment_score: 0.86,
  hierarchy_integrity_score: 0.89,
  semantic_relevance_score: 0.85,
  operational_delivery_accuracy: 0.88,
  samples: 0
};

function recordStabilizationSample(sample = {}) {
  _m.samples += 1;
  const w = 1 / Math.min(_m.samples, 200);
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
}

module.exports = { recordStabilizationSample, getStabilizationTelemetry, resetStabilizationTelemetry };
