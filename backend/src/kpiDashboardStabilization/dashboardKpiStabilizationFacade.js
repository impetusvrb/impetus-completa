'use strict';

const flags = require('../kpiRuntimeStability/config/phaseZ6FeatureFlags');
const { balanceDashboardKpiDensity } = require('./dashboardKpiDensityBalancer');
const { guardKpiWidgetIntegrity } = require('./kpiWidgetIntegrityRuntime');
const { protectCockpitVisibility } = require('./cockpitVisibilityProtector');
const { adviseContextualDashboardRecovery } = require('./contextualDashboardRecovery');

function getDashboardKpiStabilizationStatus(ctx = {}) {
  return {
    phase: 'Z.6',
    layer: 'kpi-dashboard-stabilization',
    stabilization: flags.isKpiDashboardStabilizationEnabled(),
    tenant_id: ctx.tenant_id
  };
}

function stabilizeDashboardKpis(kpis = [], ctx = {}) {
  const density = balanceDashboardKpiDensity(kpis, ctx);
  const widgets = guardKpiWidgetIntegrity(kpis);
  const cockpit = protectCockpitVisibility(kpis, ctx);
  const recovery = adviseContextualDashboardRecovery(kpis, { ...ctx, density });
  return {
    status: getDashboardKpiStabilizationStatus(ctx),
    density,
    widgets,
    cockpit,
    recovery,
    payload_unchanged: !flags.isKpiDashboardStabilizationEnabled(),
    recommendation_only: true
  };
}

module.exports = { getDashboardKpiStabilizationStatus, stabilizeDashboardKpis };
