'use strict';

function clamp01(n) {
  return Math.max(0, Math.min(1, Number(n) || 0));
}

function pressureScore(factors) {
  const sum = factors.reduce((a, f) => a + (f.weight || 1) * clamp01(f.value), 0);
  const max = factors.reduce((a, f) => a + (f.weight || 1), 0) || 1;
  return clamp01(sum / max);
}

module.exports = { clamp01, pressureScore };
