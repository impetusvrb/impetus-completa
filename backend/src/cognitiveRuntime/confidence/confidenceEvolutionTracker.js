'use strict';

const { load, save } = require('./confidenceEvolutionStore');

function trackConfidenceEvolution(user = {}, confidence = {}, validation = {}) {
  const tenantId = user?.company_id || 'default';
  const store = load(tenantId);
  const applied = validation.fallback_confidence_applied ?? confidence.unified_confidence_score;

  const snapshot = {
    at: new Date().toISOString(),
    unified: applied,
    narrative: confidence.narrative_confidence,
    causal: confidence.causal_confidence,
    operational: confidence.operational_confidence,
    integrity: validation.confidence_integrity
  };

  const snapshots = [...(store.snapshots || []), snapshot].slice(-90);
  save(tenantId, { tenant_id: tenantId, snapshots });

  let trend = 'stable';
  if (snapshots.length >= 2) {
    const prev = snapshots[snapshots.length - 2].unified;
    if (applied > prev + 0.05) trend = 'improving';
    else if (applied < prev - 0.05) trend = 'degrading';
  }

  const values = snapshots.map((s) => s.unified);
  const stability =
    values.length < 2
      ? 1
      : Number((1 - Math.min(1, Math.max(...values) - Math.min(...values))).toFixed(3));

  return {
    trend,
    stability,
    snapshot_count: snapshots.length,
    latest_unified: applied,
    precision_growth: trend === 'improving',
    auto_mutation: false
  };
}

module.exports = { trackConfidenceEvolution };
