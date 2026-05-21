'use strict';

const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');
const { assessSummaryRollbackReadiness } = require('./summaryRuntimeRollbackReadiness');

function validateTenantSummaryReadiness(tenantId, user = {}, ctx = {}) {
  if (!isPilotTenant(tenantId)) {
    return { ready: false, reason: 'not_pilot_tenant' };
  }
  const state = getTenantEnforcementState(tenantId);
  if (!state.channels.kpi && !ctx.force) {
    return { ready: false, reason: 'kpi_channel_required_first', menu_active: state.channels.menu };
  }

  let convergenceReady = false;
  try {
    const z8 = require('../summaryConvergence/summaryConvergenceFacade');
    const status = z8.getSummaryConvergenceStatus({ tenant_id: tenantId });
    convergenceReady = status.observability === true;
  } catch {
    convergenceReady = ctx.force === true;
  }

  const rollback = assessSummaryRollbackReadiness(tenantId, ctx);
  const ready = (rollback.ready || ctx.force === true) && (convergenceReady || ctx.force === true);

  return {
    ready,
    rollback,
    convergence_ready: convergenceReady,
    kpi_active: state.channels.kpi,
    menu_active: state.channels.menu,
    simulation_recommended: true
  };
}

module.exports = { validateTenantSummaryReadiness };
