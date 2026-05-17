'use strict';

const cognitive = require('../runtime-validation/enterpriseCognitiveMaturityEngine');

function analyzeOverloadReduction(input = {}) {
  const maturity = cognitive.analyzeCognitiveMaturity(input);
  const actions = [];
  if (maturity.cognitive_overload) {
    actions.push('reduce_parallel_views');
    actions.push('enable_saturation_protection');
  }
  if (maturity.contextual_fatigue) {
    actions.push('reduce_navigation_events_per_min');
  }
  if (maturity.dashboard_pressure) {
    actions.push('collapse_dashboard_widgets');
  }
  if (maturity.workflow_branching_overload) {
    actions.push('linearize_workflow_branches');
  }
  return {
    ok: true,
    assistive_only: true,
    auto_apply: false,
    maturity,
    recommended_actions: actions,
    cognitive_budget_wave4: maturity.cognitive_budget_wave4
  };
}

module.exports = { analyzeOverloadReduction };
