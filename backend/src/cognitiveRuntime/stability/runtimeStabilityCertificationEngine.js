'use strict';

function certifyRuntimeStability(payload = {}, integrity = {}, pressure = {}) {
  const inference_stability = Number(
    (1 - (payload.inference_validation_runtime?.false_positive_count ?? 0) * 0.1).toFixed(3)
  );
  const causal_stability = integrity.causal_consistency ?? 0.5;
  const economic_stability =
    payload.economic_truth_runtime?.heuristic_drift === 'stable' ? 0.85 : payload.economic_truth_runtime?.heuristic_drift === 'moderate' ? 0.6 : 0.4;
  const frontend_runtime_stability =
    payload.production_frontend_convergence?.convergence_safe === true
      ? 0.88
      : payload.production_frontend_convergence?.convergence_state === 'partial'
        ? 0.65
        : 0.4;
  const authoritative_stability =
    payload.production_authority_runtime?.authority_mode === 'AUTHORITATIVE_CONTROLLED' &&
    payload.cognitive_c4_summary?.escalation_safe
      ? 0.82
      : 0.55;

  const runtime_stability_score = Number(
    (
      (inference_stability +
        causal_stability +
        economic_stability +
        frontend_runtime_stability +
        authoritative_stability) /
      5
    ).toFixed(3)
  );

  const stability_certified = runtime_stability_score >= 0.68 && pressure.pressure_safe !== false && integrity.integrity_safe !== false;

  return {
    runtime_stability_score,
    inference_stability,
    causal_stability,
    economic_stability,
    frontend_runtime_stability,
    authoritative_stability,
    stability_certified,
    auto_mutation: false
  };
}

module.exports = { certifyRuntimeStability };
