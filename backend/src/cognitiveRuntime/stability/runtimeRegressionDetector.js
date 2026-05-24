'use strict';

const { loadSnapshots, saveSnapshot } = require('./runtimeStabilityStore');

function detectRuntimeRegression(user = {}, payload = {}, current = {}) {
  const tenantId = user?.company_id || 'default';
  const snapshot = {
    at: new Date().toISOString(),
    fallback: payload.cognitive_authority_runtime?.fallback_dominance_ratio ?? payload.production_authority_runtime?.fallback_usage_ratio ?? 0,
    convergence: payload.production_frontend_convergence?.frontend_convergence_score ?? 0,
    trust: payload.cognitive_trust_runtime?.cognitive_trust_index ?? 0,
    utility: payload.cognitive_utility_runtime?.cognitive_utility_score ?? 0,
    truth: payload.operational_truth_runtime?.operational_truth_score ?? 0,
    integrity: current.runtime_integrity_score ?? 0
  };
  const snapshots = saveSnapshot(tenantId, snapshot);
  const prev = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;

  const affected_dimensions = [];
  let regression_detected = false;

  if (prev) {
    if (snapshot.fallback > prev.fallback + 0.12) {
      regression_detected = true;
      affected_dimensions.push('fallback_increase');
    }
    if (snapshot.convergence < prev.convergence - 0.1) {
      regression_detected = true;
      affected_dimensions.push('convergence_loss');
    }
    if (snapshot.trust < prev.trust - 0.1) {
      regression_detected = true;
      affected_dimensions.push('trust_drop');
    }
    if (snapshot.utility < prev.utility - 0.1) {
      regression_detected = true;
      affected_dimensions.push('utility_drop');
    }
    if (snapshot.truth < prev.truth - 0.12) {
      regression_detected = true;
      affected_dimensions.push('truth_drop');
    }
  }

  let regression_severity = 'none';
  if (regression_detected) {
    regression_severity = affected_dimensions.length >= 3 ? 'high' : affected_dimensions.length >= 2 ? 'medium' : 'low';
  }

  const rollback_recommended = regression_severity === 'high' || regression_severity === 'medium';
  const runtime_safe = !regression_detected || regression_severity === 'low';

  return {
    regression_detected,
    affected_dimensions,
    regression_severity,
    rollback_recommended,
    runtime_safe,
    snapshot_count: snapshots.length,
    auto_rollback_executed: false,
    auto_decisions: false
  };
}

module.exports = { detectRuntimeRegression };
