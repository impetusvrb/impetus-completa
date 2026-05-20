'use strict';

const { logFinalReview } = require('../finalReview/finalReviewLogger');

function detectAnomalies(ctx = {}) {
  const anomalies = [];
  const signals = ctx.signals || {};

  if (signals.overblocking_rate > 0.2) {
    anomalies.push({ type: 'overblocking', severity: 'high', rate: signals.overblocking_rate });
    logFinalReview('RUNTIME_OVERBLOCKING_DETECTED', { rate: signals.overblocking_rate });
  }
  if (signals.degradation_score > 0.25) {
    anomalies.push({ type: 'degradation', severity: 'medium', score: signals.degradation_score });
    logFinalReview('RUNTIME_DEGRADATION_DETECTED', { score: signals.degradation_score });
  }
  if (signals.leakage_residual === true) {
    anomalies.push({ type: 'leakage_residual', severity: 'critical' });
  }
  if (signals.sanitizer_aggressiveness > 0.7) {
    anomalies.push({ type: 'sanitizer_aggressive', severity: 'medium' });
  }
  if (signals.context_starvation === true) {
    anomalies.push({ type: 'context_starvation', severity: 'high' });
  }

  try {
    const { computeHealth } = require('../governanceActivation/governanceRuntimeHealth');
    const health = computeHealth();
    if (health.governance_runtime_health === 'degraded') {
      anomalies.push({ type: 'runtime_health_degraded', severity: 'high', health });
    }
  } catch {
    /* optional */
  }

  return {
    anomaly_count: anomalies.length,
    anomalies,
    stable: anomalies.length === 0,
    auto_remediation: false
  };
}

module.exports = { detectAnomalies };
