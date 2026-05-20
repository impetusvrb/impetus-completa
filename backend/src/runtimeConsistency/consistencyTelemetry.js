'use strict';

const _m = {
  cognitive_consistency_score: 0.88,
  interchannel_alignment: 0.87,
  runtime_truth_integrity: 0.9,
  contextual_synchronization: 0.89,
  temporal_consistency: 0.91,
  pipeline_agreement_score: 0.88,
  samples: 0
};

function recordConsistencySample(sample = {}) {
  _m.samples += 1;
  const w = 1 / Math.min(_m.samples, 100);
  for (const k of Object.keys(_m)) {
    if (k === 'samples') continue;
    if (sample[k] != null) _m[k] = Number((_m[k] * (1 - w) + sample[k] * w).toFixed(4));
  }
}

function getConsistencyTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetConsistencyTelemetry() {
  _m.samples = 0;
}

module.exports = { recordConsistencySample, getConsistencyTelemetry, resetConsistencyTelemetry };
