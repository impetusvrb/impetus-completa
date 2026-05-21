'use strict';

const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');

function validateTenantKpiReadiness(tenantId, user = {}, ctx = {}) {
  if (!isPilotTenant(tenantId)) {
    return { ready: false, reason: 'not_pilot_tenant' };
  }

  const state = getTenantEnforcementState(tenantId);
  if (!state.channels.menu && !ctx.force) {
    return { ready: false, reason: 'menu_channel_required_first' };
  }

  let maturity = { kpi_channel_ready: false };
  try {
    maturity = require('../pilotMaturity/pilotMaturityFacade').assessPilotMaturity(tenantId, user, ctx);
  } catch {
    maturity = { kpi_channel_ready: ctx.force === true, maturity_score: ctx.force ? 0.8 : 0.4 };
  }

  const prep = require('../kpiEnforcementPreparation/kpiPreparationFacade').prepareKpiEnforcement(
    user,
    ctx.kpis || ctx.kpi_payload || [],
    { ...ctx, maturity, tenant_id: tenantId }
  );

  const ready =
    (maturity.kpi_channel_ready === true || ctx.force === true) &&
    prep.readiness?.kpi_channel_ready !== false;

  return {
    ready,
    maturity,
    preparation: prep,
    simulation_recommended: true,
    menu_active: state.channels.menu,
    kpi_active: state.channels.kpi
  };
}

module.exports = { validateTenantKpiReadiness };
