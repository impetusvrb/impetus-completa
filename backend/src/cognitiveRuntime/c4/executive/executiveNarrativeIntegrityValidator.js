'use strict';

function validateExecutiveNarrativeIntegrity(payload = {}, alignment = {}, truth = {}) {
  const exec = payload.executive_cognitive_runtime;
  const summary = payload.specialized_summary || '';
  const hasCausal = (truth.validated_causalities?.length ?? 0) > 0;
  const hasGraph = (payload.production_operational_graph_runtime?.graph?.node_count ?? 0) > 5;

  const weak_boardroom_inference =
    exec?.consolidation_applied && !hasCausal && summary.length > 30 && !hasGraph;

  const unsupported_executive_insights =
    exec?.consolidation_applied && alignment.narrative_dependency_ratio > 0.55;

  let narrative_risk_level = 'low';
  if (weak_boardroom_inference || unsupported_executive_insights) narrative_risk_level = 'medium';
  if (alignment.narrative_dependency_ratio > 0.7 && !hasCausal) narrative_risk_level = 'high';

  const executive_narrative_integrity = Number(
    Math.max(
      0,
      Math.min(1, 1 - (weak_boardroom_inference ? 0.25 : 0) - (unsupported_executive_insights ? 0.2 : 0) - (narrative_risk_level === 'high' ? 0.3 : 0))
    ).toFixed(3)
  );

  return {
    executive_narrative_integrity,
    weak_boardroom_inference,
    unsupported_executive_insights,
    narrative_risk_level,
    boardroom_artificial: weak_boardroom_inference && !hasGraph,
    auto_decisions: false
  };
}

module.exports = { validateExecutiveNarrativeIntegrity };
