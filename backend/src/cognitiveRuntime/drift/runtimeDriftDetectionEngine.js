'use strict';

const { loadSnapshots } = require('../stability/runtimeStabilityStore');

function detectRuntimeDrift(user = {}, payload = {}) {
  const tenantId = user?.company_id || 'default';
  const store = loadSnapshots(tenantId);
  const prev = store.snapshots?.length >= 2 ? store.snapshots[store.snapshots.length - 2] : null;
  const curr = store.snapshots?.length ? store.snapshots[store.snapshots.length - 1] : null;

  const drift_dimensions = [];
  const checks = [
    { key: 'confidence', curr: payload.real_confidence_runtime?.unified_confidence_score, prev: null, threshold: 0.12 },
    { key: 'trust', curr: payload.cognitive_trust_runtime?.cognitive_trust_index, prev: prev?.trust, threshold: 0.1 },
    { key: 'utility', curr: payload.cognitive_utility_runtime?.cognitive_utility_score, prev: prev?.utility, threshold: 0.1 },
    { key: 'truth', curr: payload.operational_truth_runtime?.operational_truth_score, prev: prev?.truth, threshold: 0.12 },
    { key: 'authority', curr: payload.production_authority_runtime?.runtime_authority_score, prev: null, threshold: 0.15 },
    { key: 'economic', curr: payload.economic_pressure_runtime?.economic_pressure_index, prev: null, threshold: 0.2 }
  ];

  for (const c of checks) {
    if (c.curr == null) continue;
    if (c.prev != null && Math.abs(c.curr - c.prev) > c.threshold) drift_dimensions.push(c.key);
    if (payload.economic_truth_runtime?.heuristic_drift && payload.economic_truth_runtime.heuristic_drift !== 'stable') {
      if (!drift_dimensions.includes('economic')) drift_dimensions.push('economic');
    }
    if (payload.executive_alignment_runtime?.narrative?.narrative_risk_level === 'high' && !drift_dimensions.includes('narrative')) {
      drift_dimensions.push('narrative');
    }
  }

  const drift_detected = drift_dimensions.length > 0;
  let drift_severity = 'none';
  if (drift_dimensions.length >= 4) drift_severity = 'high';
  else if (drift_dimensions.length >= 2) drift_severity = 'medium';
  else if (drift_dimensions.length === 1) drift_severity = 'low';

  const drift_velocity = prev && curr ? Number(Math.abs((curr.integrity ?? 0) - (prev.integrity ?? 0)).toFixed(3)) : 0;
  const runtime_stability_risk = drift_severity === 'high' ? 'elevated' : drift_severity === 'medium' ? 'moderate' : 'stable';

  return {
    drift_detected,
    drift_dimensions,
    drift_severity,
    drift_velocity,
    runtime_stability_risk,
    auto_mutation: false
  };
}

module.exports = { detectRuntimeDrift };
