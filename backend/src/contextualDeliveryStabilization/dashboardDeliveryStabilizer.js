'use strict';

const phaseP = require('./config/phasePFeatureFlags');
const { composeGovernedDashboard } = require('./governedDashboardComposition');

function stabilizeDashboardDelivery(user, widgets, ctx = {}) {
  const composed = composeGovernedDashboard(widgets, user, ctx);
  const enforcement = phaseP.isDashboardStabilizationEnabled();
  return {
    ...composed,
    dashboard_targeting_precision: Number(composed.dashboard_targeting_precision.toFixed(4)),
    enforcement_active: enforcement,
    shadow_only: !enforcement,
    widgets_delivered: enforcement ? composed.widgets : widgets
  };
}

module.exports = { stabilizeDashboardDelivery };
