'use strict';

const { getPilotTenant } = require('../pilotTenants/pilotTenantRegistry');

function buildTenantGovernanceHistory(tenantId) {
  const pilot = getPilotTenant(tenantId);
  return {
    tenant_id: tenantId,
    pilot_registered_at: pilot?.registered_at,
    kpi_activated_at: pilot?.kpi_activated_at,
    summary_activated_at: pilot?.summary_activated_at,
    channels_allowed: pilot?.channels_allowed || [],
    recommendation_only: true
  };
}

module.exports = { buildTenantGovernanceHistory };
