'use strict';

function assessSummaryRuntimeHealth(pack = {}) {
  const issues = [];
  if (pack.blindness?.critical_blind_spot) issues.push('blind_spot');
  if (pack.underdelivery?.critical_underdelivery) issues.push('underdelivery');
  if (pack.stability?.unstable) issues.push('instability');
  if (pack.targeting?.narrative_leakage_detected) issues.push('leakage');

  const score = Math.max(0, 1 - issues.length * 0.2);
  return {
    health_score: score,
    healthy: issues.length === 0,
    issues,
    graceful_degradation: true
  };
}

module.exports = { assessSummaryRuntimeHealth };
