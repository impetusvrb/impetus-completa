'use strict';

const _m = {
  alignment_score: 0.86,
  guidance_usefulness: 0.84,
  reasoning_quality_score: 0.85,
  conversational_confidence: 0.83,
  narrative_integrity: 0.87,
  samples: 0
};

function recordChatAlignmentSample(sample = {}) {
  _m.samples += 1;
  const w = 1 / Math.min(_m.samples, 200);
  for (const k of Object.keys(_m)) {
    if (k === 'samples') continue;
    if (sample[k] != null) _m[k] = Number((_m[k] * (1 - w) + sample[k] * w).toFixed(4));
  }
}

function getChatAlignmentTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetChatAlignmentTelemetry() {
  _m.samples = 0;
}

module.exports = { recordChatAlignmentSample, getChatAlignmentTelemetry, resetChatAlignmentTelemetry };
