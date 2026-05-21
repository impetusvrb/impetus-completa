'use strict';

const flags = require('../pilotTenants/config/phaseZ3FeatureFlags');
const { logPhaseZ3 } = require('../pilotTenants/phaseZ3Logger');

function stabilizeDashboardGracefully(payload = {}, ctx = {}) {
  const widgets = payload.widgets || ctx.widgets || [];
  const sections = payload.sections || ctx.sections || [];
  const empty = widgets.length === 0 && sections.length === 0;

  if (empty && flags.isPilotRuntimeObservabilityEnabled()) {
    logPhaseZ3('EMPTY_DASHBOARD_PROTECTED', { tenant_id: ctx.tenant_id, shadow_only: true });
  }

  return {
    widgets_preserved: widgets.length,
    sections_preserved: sections.length,
    empty_dashboard: empty,
    stabilization_applied: flags.isDashboardGracefulStabilizationEnabled(),
    layout_safe: true,
    applied: false,
    simulation_only: !flags.isDashboardGracefulStabilizationEnabled()
  };
}

module.exports = { stabilizeDashboardGracefully };
