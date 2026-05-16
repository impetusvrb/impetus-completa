'use strict';

const { buildRolloutExplainability } = require('../explainability/qualityRolloutExplainability');

function analyzeAdoption(snapshot = {}) {
  const teams = Number(snapshot.active_teams) || 0;
  const operators = Number(snapshot.active_operators) || 0;
  const shift_coverage = Math.max(0, Math.min(1, Number(snapshot.shift_coverage) || 0));
  const abandonment_rate = Math.max(0, Math.min(1, Number(snapshot.abandonment_rate) || 0));
  const cognitive_interaction_rate = Math.max(0, Math.min(1, Number(snapshot.cognitive_interaction_rate) || 0));
  const workflow_completion = Math.max(0, Math.min(1, Number(snapshot.workflow_completion_rate) || 0));

  const participation = Math.min(
    1,
    (operators > 0 ? 0.25 : 0) + shift_coverage * 0.25 + workflow_completion * 0.35 + (1 - abandonment_rate) * 0.15
  );

  return {
    ok: true,
    active_teams: teams,
    active_operators: operators,
    shift_coverage,
    abandonment_rate,
    recommendation_acceptance: Math.max(0, Math.min(1, Number(snapshot.recommendation_acceptance) || 0)),
    cognitive_interaction_rate,
    workflow_completion_rate: workflow_completion,
    operational_participation_index: participation,
    saturation_hint: cognitive_interaction_rate > 0.85 && abandonment_rate > 0.25,
    explainability: buildRolloutExplainability({
      rationale: 'Índices derivados de métricas de participação declaradas.',
      adoption_evidence: [`operators=${operators}`, `workflow_completion=${workflow_completion.toFixed(2)}`],
      saturation_indicators: cognitive_interaction_rate > 0.85 ? ['high_cognitive_touch_rate'] : []
    })
  };
}

module.exports = { analyzeAdoption };
