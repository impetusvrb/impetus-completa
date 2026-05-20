'use strict';

const _m = {
  convergence_rate: 0.86,
  truth_integrity: 0.88,
  contextual_unification_score: 0.84,
  cognitive_fragmentation_rate: 0.1,
  summary_consistency_rate: 0.87,
  insight_consistency_rate: 0.85,
  runtime_truth_confidence: 0.89,
  semantic_convergence_health: 0.86,
  samples: 0
};

function recordConvergenceSample(sample = {}) {
  _m.samples += 1;
  const w = 1 / Math.min(_m.samples, 100);
  for (const k of Object.keys(_m)) {
    if (k === 'samples') continue;
    if (sample[k] != null) _m[k] = Number((_m[k] * (1 - w) + sample[k] * w).toFixed(4));
  }
}

function getConvergenceTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetConvergenceTelemetry() {
  _m.samples = 0;
  _m.cognitive_fragmentation_rate = 0.1;
}

module.exports = { recordConvergenceSample, getConvergenceTelemetry, resetConvergenceTelemetry };
