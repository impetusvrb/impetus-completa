'use strict';

const _history = [];

function recordStabilitySample(score) {
  _history.push({ score, ts: Date.now() });
  if (_history.length > 50) _history.shift();
}

function computeRuntimeStability() {
  if (_history.length < 2) return { runtime_stability: 0.9, variance: 0 };
  const scores = _history.map((h) => h.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, s) => a + (s - mean) ** 2, 0) / scores.length;
  const runtime_stability = Number(Math.max(0, Math.min(1, 1 - Math.sqrt(variance) * 2)).toFixed(4));
  return { runtime_stability, variance: Number(variance.toFixed(4)), samples: _history.length };
}

function clearStabilityHistory() {
  _history.length = 0;
}

module.exports = { recordStabilitySample, computeRuntimeStability, clearStabilityHistory };
