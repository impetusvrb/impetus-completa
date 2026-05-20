'use strict';

const _m = {
  summary_delivery_precision: 0.86,
  summary_usefulness: 0.84,
  operational_relevance: 0.85,
  narrative_integrity: 0.87,
  contextual_alignment: 0.86,
  hierarchy_coherence: 0.88,
  samples: 0
};

function recordSummaryGovernanceSample(sample = {}) {
  _m.samples += 1;
  const w = 1 / Math.min(_m.samples, 200);
  for (const k of Object.keys(_m)) {
    if (k === 'samples') continue;
    if (sample[k] != null) _m[k] = Number((_m[k] * (1 - w) + sample[k] * w).toFixed(4));
  }
}

function getSummaryGovernanceTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetSummaryGovernanceTelemetry() {
  _m.samples = 0;
}

module.exports = { recordSummaryGovernanceSample, getSummaryGovernanceTelemetry, resetSummaryGovernanceTelemetry };
