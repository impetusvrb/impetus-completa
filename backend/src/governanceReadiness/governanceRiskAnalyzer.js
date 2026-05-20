'use strict';

function classifyLeakageRisk(metrics = {}) {
  const denyRate = metrics.denied_exposure_rate || 0;
  const shadowDiv = metrics.shadow_divergence_rate || 0;
  const conflicts = metrics.governance_conflict_rate || 0;
  if (shadowDiv > 0.2 || conflicts > 0.15) return 'high';
  if (shadowDiv > 0.08 || denyRate > 0.25) return 'medium';
  return 'low';
}

function classifyOverblockingRisk(metrics = {}) {
  const ob = metrics.governance_overblocking_rate ?? metrics.denied_exposure_rate ?? 0;
  const san = metrics.sanitizer_aggressiveness ?? 0;
  const fp = metrics.governance_false_positive_rate ?? 0;
  const combined = ob * 0.5 + san * 0.3 + fp * 0.2;
  if (combined > 0.25) return 'high';
  if (combined > 0.12) return 'medium';
  return 'low';
}

function analyzeRisks(metrics = {}, signals = {}) {
  return {
    leakage_risk: classifyLeakageRisk(metrics),
    overblocking_risk: classifyOverblockingRisk(metrics),
    regression_risk: metrics.governance_drift_rate > 0.3 ? 'high' : metrics.governance_drift_rate > 0.12 ? 'medium' : 'low',
    false_positive_signals: signals.false_positives || [],
    overblocking_signals: signals.overblocking || []
  };
}

module.exports = { analyzeRisks, classifyLeakageRisk, classifyOverblockingRisk };
