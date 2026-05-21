'use strict';

const { getPilotTenant } = require('../pilotTenants/pilotTenantRegistry');

function buildRolloutScalingHistory(tenantId) {
  const pilot = getPilotTenant(tenantId);
  return {
    tenant_id: tenantId,
    channels_allowed: pilot?.channels_allowed || [],
    kpi_activated_at: pilot?.kpi_activated_at,
    summary_activated_at: pilot?.summary_activated_at,
    recommendation_only: true
  };
}

module.exports = { buildRolloutScalingHistory };
