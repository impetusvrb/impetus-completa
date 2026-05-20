'use strict';

function correlateRuntimeAnomalies(signals = {}) {
  const anomalies = [];
  if (signals.drift_detected) anomalies.push({ type: 'drift', weight: 0.25 });
  if (signals.fallback_rate > 0.15) anomalies.push({ type: 'fallback', weight: 0.2 });
  if (signals.entropy > 0.35) anomalies.push({ type: 'entropy', weight: 0.2 });
  if (signals.leakage_count > 0) anomalies.push({ type: 'leakage', weight: 0.2 });
  if (signals.divergence_count > 0) anomalies.push({ type: 'divergence', weight: 0.15 });

  const score = anomalies.reduce((a, x) => a + x.weight, 0);
  return {
    correlated_anomalies: anomalies,
    correlation_score: Number(Math.min(1, score).toFixed(4)),
    critical: score >= 0.5
  };
}

module.exports = { correlateRuntimeAnomalies };
