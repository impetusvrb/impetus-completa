'use strict';

const flags = require('../contextualEnforcement/config/phaseZ1FeatureFlags');
const { superviseContextualDensity } = require('./contextualDensitySupervisor');
const { analyzeDashboardDensity } = require('./dashboardDensityAnalyzer');

function getDashboardDensityStatus(ctx = {}) {
  return {
    phase: 'Z.1',
    layer: 'dashboard-density',
    governance: flags.isDashboardDensityGovernanceEnabled(),
    observability: flags.isContextualEnforcementObservabilityEnabled(),
    recommendation_only: true,
    enforcement_applied: false,
    tenant_id: ctx.tenant_id
  };
}

function getDashboardDensityReport(ctx = {}) {
  const supervision = superviseContextualDensity(ctx);
  return { ok: true, status: getDashboardDensityStatus(ctx), ...supervision, auto_apply: false };
}

module.exports = {
  getDashboardDensityStatus,
  analyzeDashboardDensity,
  superviseContextualDensity,
  getDashboardDensityReport
};
