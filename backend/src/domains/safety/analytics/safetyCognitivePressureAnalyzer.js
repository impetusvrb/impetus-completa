'use strict';

/**
 * SafetyCognitivePressureAnalyzer — integração com sinais WAVE4-like (bounded, sem authority).
 */

/**
 * @param {object} input
 * @param {number} [input.menu_extra_count]
 * @param {number} [input.view_count]
 * @param {number} [input.navigation_events_per_min]
 * @param {number} [input.dashboard_widget_count]
 * @param {number} [input.branching_factor]
 * @param {number} [input.cognitive_budget_remaining] 0–100
 */
function analyzeCognitivePressure(input) {
  const menuExtra = Math.max(0, Number(input.menu_extra_count) || 0);
  const views = Math.max(0, Number(input.view_count) || 0);
  const navPerMin = Math.max(0, Number(input.navigation_events_per_min) || 0);
  const widgets = Math.max(0, Number(input.dashboard_widget_count) || 0);
  const branching = Math.max(0, Number(input.branching_factor) || 0);
  const budget = input.cognitive_budget_remaining != null ? Number(input.cognitive_budget_remaining) : 70;

  const navigationFatigue = Math.min(100, menuExtra * 5 + navPerMin * 2);
  const dashboardOverload = Math.min(100, widgets * 4 + views * 3);
  const decisionDensity = Math.min(100, branching * 12 + menuExtra * 3);
  const workflowSaturation = Math.min(100, (navigationFatigue + decisionDensity) / 2);

  const cognitiveRiskScore = Math.min(
    100,
    Math.round(navigationFatigue * 0.35 + dashboardOverload * 0.25 + decisionDensity * 0.25 + workflowSaturation * 0.15)
  );
  const operationalOverloadScore = Math.min(100, Math.round(workflowSaturation * 0.6 + navPerMin * 1.5));
  const dashboardDensityScore = Math.min(100, Math.round(dashboardOverload));

  const budgetPenalty = budget < 30 ? 15 : budget < 50 ? 8 : 0;
  const adjustedRisk = Math.min(100, cognitiveRiskScore + budgetPenalty);

  const overload =
    adjustedRisk >= 78 ||
    navigationFatigue >= 80 ||
    dashboardOverload >= 75 ||
    workflowSaturation >= 82;

  return {
    ok: true,
    cognitive_risk_score: adjustedRisk,
    operational_overload_score: operationalOverloadScore,
    dashboard_density_score: dashboardDensityScore,
    navigation_fatigue: navigationFatigue,
    workflow_saturation: workflowSaturation,
    overload_detected: overload,
    saturation_protection_recommended: adjustedRisk >= 65,
    assistive_only: true
  };
}

module.exports = { analyzeCognitivePressure };
