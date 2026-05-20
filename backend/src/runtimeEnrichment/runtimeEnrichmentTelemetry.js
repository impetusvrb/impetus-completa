'use strict';

const _m = {
  runtime_density_score: 0.82,
  operational_density: 0.8,
  contextual_richness: 0.81,
  semantic_usefulness: 0.79,
  insight_feeding_quality: 0.78,
  samples: 0
};

function recordEnrichmentSample(sample = {}) {
  _m.samples += 1;
  const w = 1 / Math.min(_m.samples, 250);
  for (const k of Object.keys(_m)) {
    if (k === 'samples') continue;
    if (sample[k] != null) _m[k] = Number((_m[k] * (1 - w) + sample[k] * w).toFixed(4));
  }
}

function getEnrichmentTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetEnrichmentTelemetry() {
  _m.samples = 0;
}

module.exports = { recordEnrichmentSample, getEnrichmentTelemetry, resetEnrichmentTelemetry };
