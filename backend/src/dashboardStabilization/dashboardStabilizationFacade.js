'use strict';

const flags = require('../pilotTenants/config/phaseZ3FeatureFlags');
const { stabilizeDashboardGracefully } = require('./gracefulDashboardStabilizer');
const { applyContextualWidgetFallback } = require('./contextualWidgetFallback');
const { balanceDashboardDensity } = require('./dashboardDensityBalancer');
const { protectEmptyDashboard } = require('./emptyDashboardProtection');

function stabilizeDashboard(payload = {}, user = {}, ctx = {}) {
  const merged = { ...payload, widgets: payload.widgets, sections: payload.sections, kpis: payload.kpis };
  const graceful = stabilizeDashboardGracefully(merged, { ...ctx, tenant_id: user?.company_id });
  const widgets = applyContextualWidgetFallback(merged.widgets || [], ctx);
  const density = balanceDashboardDensity(ctx);
  const empty = protectEmptyDashboard(merged);

  return {
    phase: 'Z.3',
    graceful,
    widgets,
    density,
    empty_protection: empty,
    stabilization_enabled: flags.isDashboardGracefulStabilizationEnabled(),
    payload_unchanged: true,
    recommendation_only: true
  };
}

module.exports = { stabilizeDashboard };
