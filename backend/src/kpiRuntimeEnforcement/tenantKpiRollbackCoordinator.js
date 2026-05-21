'use strict';

const flags = require('./config/phaseZ5FeatureFlags');
const { logPhaseZ5 } = require('./phaseZ5Logger');
const { getPilotTenant, isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { setTenantEnforcementChannel } = require('../contextualActivation/tenantEnforcementState');

function rollbackTenantKpi(tenantId, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return { rolled_back: false, prepared: true, reason: 'execute_and_approved_by_required' };
  }
  if (!isPilotTenant(tenantId)) {
    return { rolled_back: false, reason: 'not_pilot_tenant' };
  }

  setTenantEnforcementChannel(tenantId, 'kpi', false);

  const pilot = getPilotTenant(tenantId);
  const restored =
    ctx.kpis_before ||
    pilot?.kpi_snapshot ||
    [];

  logPhaseZ5('PILOT_KPI_ROLLBACK', { tenant_id: tenantId, approved_by: ctx.approved_by });

  return {
    rolled_back: true,
    tenant_id: tenantId,
    kpi_channel_deactivated: true,
    kpis_restored: restored,
    menu_preserved: true,
    summary_blocked: true,
    auto_execute: false
  };
}

module.exports = { rollbackTenantKpi };
