'use strict';

function scoreOperationalUsefulness(parts = {}) {
  const weights = [
    parts.oee?.contextual_integrity ?? 0.5,
    parts.throughput?.consistent !== false ? 0.85 : 0.4,
    parts.bottleneck?.precise !== false ? 0.8 : 0.35,
    parts.density?.safe !== false ? 0.9 : 0.3,
    parts.semantic?.ok !== false ? 0.88 : 0.2,
    parts.ai?.industrial !== false ? 0.82 : 0.25
  ];
  const score = weights.reduce((a, b) => a + b, 0) / weights.length;
  return Math.round(score * 100) / 100;
}

module.exports = { scoreOperationalUsefulness };
