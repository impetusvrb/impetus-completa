'use strict';

const flags = require('../contextualEnforcement/config/phaseZ1FeatureFlags');
const { logPhaseZ1 } = require('../contextualEnforcement/phaseZ1Logger');

function analyzeDashboardDensity(ctx = {}) {
  const widgets = ctx.widgets || ctx.widget_count || 8;
  const widgetCount = typeof widgets === 'number' ? widgets : widgets.length;
  const generic = ctx.generic_dashboard || ctx.genericity_score >= 0.5;
  const axis = ctx.domain_axis || ctx.functional_axis;

  let density_score = 0.85;
  if (generic) density_score -= 0.25;
  if (!axis || axis === 'unknown') density_score -= 0.2;
  if (widgetCount > 14) density_score -= 0.15;
  if (widgetCount < 3) density_score -= 0.1;

  density_score = Number(Math.max(0.25, density_score).toFixed(4));

  if (density_score < 0.55 && flags.isContextualEnforcementObservabilityEnabled()) {
    logPhaseZ1('DASHBOARD_DENSITY_LOW', { density_score, generic, shadow_only: true });
  }

  return {
    density_score,
    widget_count: widgetCount,
    generic_dashboard: generic,
    operational_noise: widgetCount > 12 && !generic,
    recommendation_only: true,
    enforcement_applied: false
  };
}

module.exports = { analyzeDashboardDensity };
