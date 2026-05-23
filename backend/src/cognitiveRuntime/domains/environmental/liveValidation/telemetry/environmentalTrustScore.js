'use strict';

function computeEnvironmentalTrustScore(signalBundle = {}, stale = {}) {
  let score = 0.45;
  if (signalBundle.ok) score += 0.15;
  if (signalBundle.telemetry_readiness === 'ready') score += 0.25;
  if (!stale.stale_detected) score += 0.1;
  const coverage = signalBundle.telemetry?.sensor_coverage ?? 0;
  score = Math.min(1, score * 0.75 + coverage * 0.25);
  return { trust_score: Math.round(score * 100) / 100, sensor_coverage: coverage };
}

module.exports = { computeEnvironmentalTrustScore };
