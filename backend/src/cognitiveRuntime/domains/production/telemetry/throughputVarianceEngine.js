'use strict';

function computeThroughputVariance(lines = []) {
  const values = lines.map((l) => parseFloat(l.produced_qty || 0)).filter((v) => v >= 0);
  if (values.length < 2) {
    return { variance: 0, coefficient: 0, unstable: false };
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const coefficient = mean > 0 ? Math.sqrt(variance) / mean : 0;
  return {
    variance: Math.round(variance * 100) / 100,
    coefficient: Math.round(coefficient * 1000) / 1000,
    unstable: coefficient > 0.35
  };
}

module.exports = { computeThroughputVariance };
