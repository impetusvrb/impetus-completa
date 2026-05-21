'use strict';

const flags = require('./config/phaseZ2FeatureFlags');
const { getTenantEnforcementState } = require('./tenantEnforcementState');

function applyTenantDashboardGovernance(payload = {}, user = {}, ctx = {}) {
  const tenantId = user?.company_id;
  const state = getTenantEnforcementState(tenantId);
  if (!state.enforcement_active || !state.channels.dashboard || !flags.isTenantContextualEnforcementEnabled()) {
    return { payload, governance_applied: false };
  }

  let density = null;
  try {
    density = require('../dashboardDensity/dashboardDensityFacade').superviseContextualDensity({
      ...ctx,
      widgets: payload.widgets,
      hierarchy_level: ctx.canonical_identity?.hierarchy_level
    });
  } catch {
    density = null;
  }

  return {
    payload,
    governance_applied: true,
    density_supervision: density,
    graceful_only: true,
    widget_cap_simulation: density?.reduction?.widgets_cap_simulation
  };
}

module.exports = { applyTenantDashboardGovernance };
