'use strict';

function validateCausalIntegrity(payload = {}) {
  const graph = payload.production_operational_graph_runtime;
  const causal = graph?.causal?.chains || [];
  const truth = payload.operational_truth_runtime;
  const memory = payload.operational_memory_runtime;

  const weak_causalities = [];
  const unsupported_correlations = truth?.false_operational_correlations || [];

  for (const c of causal) {
    if ((c.confidence_score ?? 0) < 0.55) weak_causalities.push(c.chain_id || c.hypothesis);
    if (c.artificial === true) unsupported_correlations.push({ id: c.chain_id, reason: 'artificial_flag' });
  }

  const recursive_drift_detected = causal.some(
    (c) => (c.causal_chain || []).includes('production') && (c.causal_chain || []).includes('maintenance') && c.recurrence_factor > 0.9
  );

  const densityLow = (memory?.causal_density ?? 1) < 0.35 && causal.length > 3;
  if (densityLow) weak_causalities.push('causal_density_mismatch');

  const causal_integrity_score = Number(
    Math.max(
      0,
      Math.min(
        1,
        (truth?.operational_truth_score ?? 0.5) * 0.4 +
          (memory?.causal_density ?? 0.5) * 0.3 +
          (1 - weak_causalities.length * 0.08) * 0.3
      )
    ).toFixed(3)
  );

  const causal_safety = causal_integrity_score >= 0.55 && !recursive_drift_detected && unsupported_correlations.length < 3;

  return {
    causal_integrity_score,
    weak_causalities,
    recursive_drift_detected,
    unsupported_correlations,
    causal_safety
  };
}

module.exports = { validateCausalIntegrity };
