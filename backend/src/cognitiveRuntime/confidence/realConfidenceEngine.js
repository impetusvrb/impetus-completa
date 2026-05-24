'use strict';

function computeRealConfidence(payload = {}, graph = {}, memory = {}, inference = {}) {
  const hasNarrative = !!(payload.specialized_summary || payload.production_cognitive_runtime);
  const narrative_confidence = hasNarrative
    ? Number(Math.min(0.75, 0.45 + (payload.specialized_summary?.length > 20 ? 0.2 : 0)).toFixed(3))
    : 0.35;

  const graphConf = graph.graph_readiness ?? 0;
  const statistical_confidence = Number(
    Math.min(0.9, graphConf * 0.6 + (inference.reliability_metrics?.precision ?? 0.5) * 0.4).toFixed(3)
  );

  const causal_confidence = Number(
    Math.min(0.92, (memory.causal_density ?? 0) * 0.7 + (payload.operational_memory_runtime?.memory_quality_score ?? 0) * 0.3).toFixed(3)
  );

  const prod = payload.production_cognitive_runtime;
  const operational_confidence = Number(
    (prod?.consolidation_applied ? 0.78 : 0.4) * (payload.event_density_runtime?.inferential_support_score ?? 0.6)
  ).toFixed(3);

  const historical_confidence = Number(
    Math.min(0.88, (inference.inference_truth_score ?? 0.5) * 0.5 + (memory.verified_operational_memory_ratio ?? 0) * 0.5).toFixed(3)
  );

  const dims = [
    Number(narrative_confidence),
    Number(statistical_confidence),
    Number(causal_confidence),
    Number(operational_confidence),
    Number(historical_confidence)
  ];
  const unified_confidence_score = Number((dims.reduce((a, b) => a + b, 0) / dims.length).toFixed(3));

  return {
    narrative_confidence,
    statistical_confidence,
    causal_confidence,
    operational_confidence: Number(operational_confidence),
    historical_confidence,
    unified_confidence_score,
    flat_score_avoided: true,
    auto_decisions: false
  };
}

module.exports = { computeRealConfidence };
