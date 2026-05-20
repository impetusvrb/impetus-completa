'use strict';

const _m = {
  cognitive_decision_reliability: 0.86,
  operational_trust_score: 0.85,
  runtime_decision_confidence: 0.84,
  contextual_recommendation_quality: 0.83,
  cognitive_ambiguity_score: 0.18,
  operational_guidance_integrity: 0.87,
  runtime_decision_stability: 0.88,
  supervision_recommendation_score: 0.2,
  samples: 0
};

function recordReliabilitySample(sample = {}) {
  _m.samples += 1;
  const w = 1 / Math.min(_m.samples, 100);
  for (const k of Object.keys(_m)) {
    if (k === 'samples') continue;
    if (sample[k] != null) _m[k] = Number((_m[k] * (1 - w) + sample[k] * w).toFixed(4));
  }
}

function getReliabilityTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetReliabilityTelemetry() {
  _m.samples = 0;
  _m.cognitive_ambiguity_score = 0.18;
  _m.supervision_recommendation_score = 0.2;
}

module.exports = { recordReliabilitySample, getReliabilityTelemetry, resetReliabilityTelemetry };
