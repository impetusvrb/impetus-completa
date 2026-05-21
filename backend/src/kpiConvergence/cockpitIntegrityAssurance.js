'use strict';

const { protectCockpitVisibility } = require('../kpiDashboardStabilization/cockpitVisibilityProtector');
const { guardKpiWidgetIntegrity } = require('../kpiDashboardStabilization/kpiWidgetIntegrityRuntime');

function assureCockpitIntegrity(kpis = [], ctx = {}) {
  const cockpit = protectCockpitVisibility(kpis, ctx);
  const widgets = guardKpiWidgetIntegrity(kpis);
  return {
    cockpit_preserved: cockpit.cockpit_preserved,
    frontend_safe: cockpit.frontend_safe && widgets.widgets_preserved,
    widgets
  };
}

module.exports = { assureCockpitIntegrity };
