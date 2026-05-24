'use strict';

function computeExecutiveOperationalAlignment(payload = {}, truth = {}, economicTruth = {}) {
  const exec = payload.executive_cognitive_runtime;
  const graph = payload.production_operational_graph_runtime;
  const confidence = payload.real_confidence_runtime;
  const utility = payload.cognitive_utility_runtime;

  const production_alignment = payload.production_cognitive_runtime?.consolidation_applied ? 0.85 : 0.35;
  const economic_alignment = economicTruth.operational_economic_truth ? 0.8 : 0.45;
  const causal_alignment = (graph?.causal?.chains?.length ?? 0) > 0 ? 0.78 : 0.4;
  const operational_truth_alignment = truth.operational_truth_score ?? 0.5;

  const narrative_dependency_ratio = exec?.consolidation_applied && !truth.validated_causalities?.length ? 0.7 : 0.25;

  const executive_alignment_score = Number(
    (
      production_alignment * 0.25 +
      economic_alignment * 0.2 +
      causal_alignment * 0.2 +
      operational_truth_alignment * 0.2 +
      (confidence?.validation?.confidence_integrity === 'valid' ? 0.1 : 0.05) +
      (utility?.cognitive_utility_score ?? 0.5) * 0.05 -
      narrative_dependency_ratio * 0.15
    ).toFixed(3)
  );

  const executive_runtime_integrity =
    executive_alignment_score >= 0.65 && narrative_dependency_ratio < 0.5 && exec?.global_replace !== true;

  return {
    executive_alignment_score: Math.max(0, Math.min(1, executive_alignment_score)),
    production_alignment,
    economic_alignment,
    causal_alignment,
    operational_truth_alignment,
    narrative_dependency_ratio: Number(narrative_dependency_ratio.toFixed(3)),
    executive_runtime_integrity,
    auto_decisions: false
  };
}

module.exports = { computeExecutiveOperationalAlignment };
