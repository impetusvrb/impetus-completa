'use strict';

function envBool(key) {
  return String(process.env[key] || '').toLowerCase() === 'true';
}

/**
 * Integração leve com WAVE 4 cognitive budget (sem alterar pipeline central).
 * @param {object} input
 */
function analyzeCognitiveMaturity(input = {}) {
  const budgetEnabled = envBool('IMPETUS_AI_CONTEXT_BUDGET_ENABLED');
  const menuExtra = Number(input.menu_extra_count) || 0;
  const views = Number(input.view_count) || 0;
  const branching = Number(input.branching_factor) || 1;
  const widgets = Number(input.dashboard_widget_count) || 0;
  const eventsPerMin = Number(input.navigation_events_per_min) || 0;
  const budgetRemaining = Number(input.cognitive_budget_remaining);
  const budget = Number.isFinite(budgetRemaining) ? budgetRemaining : budgetEnabled ? 70 : 100;

  const overload =
    menuExtra * 5 + views * 4 + branching * 8 + widgets * 3 + eventsPerMin * 0.5 + (100 - budget) * 0.3;

  const cognitiveMaturity = Math.max(0, Math.min(100, 100 - overload));
  const operationalMaturity = Math.max(0, Math.min(100, 100 - menuExtra * 4 - eventsPerMin * 0.8));
  const contextualMaturity = Math.max(0, Math.min(100, 100 - views * 6 - branching * 5));
  const rolloutReadiness = Math.round((cognitiveMaturity + operationalMaturity + contextualMaturity) / 3);

  const fatigue =
    eventsPerMin > 15 || menuExtra > 12 || views > 5 || branching > 4 || widgets > 10;

  return {
    ok: true,
    cognitive_budget_wave4: budgetEnabled,
    cognitive_maturity_score: Math.round(cognitiveMaturity),
    operational_maturity_score: Math.round(operationalMaturity),
    contextual_maturity_score: Math.round(contextualMaturity),
    rollout_readiness_score: rolloutReadiness,
    cognitive_overload: overload >= 55,
    contextual_fatigue: fatigue,
    dashboard_pressure: widgets > 8,
    workflow_branching_overload: branching > 4,
    contextual_overload_score: Math.min(100, Math.round(overload)),
    assistive_only: true
  };
}

module.exports = { analyzeCognitiveMaturity };
