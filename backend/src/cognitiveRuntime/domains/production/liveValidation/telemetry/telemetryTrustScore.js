'use strict';

function computeTelemetryTrustScore(signalBundle = {}, stale = {}, degraded = {}) {
  let score = 0.5;
  if (signalBundle.ok) score += 0.15;
  if (signalBundle.telemetry_readiness === 'ready') score += 0.2;
  if (!stale.stale_detected) score += 0.1;
  if (degraded.degraded_signals === 0) score += 0.1;
  const monitored = signalBundle.raw?.monitored?.total ?? 0;
  const lines = signalBundle.operational?.lines_active ?? 0;
  const coverage = monitored > 0 && lines > 0 ? Math.min(1, (monitored + lines) / 10) : lines > 0 ? 0.5 : 0;
  score = Math.min(1, score * 0.7 + coverage * 0.3);
  return {
    trust_score: Math.round(score * 100) / 100,
    sensor_coverage: Math.round(coverage * 100) / 100
  };
}

module.exports = { computeTelemetryTrustScore };
