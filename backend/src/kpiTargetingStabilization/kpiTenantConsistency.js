'use strict';

const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');

function assessKpiTenantConsistency(tenantId, ctx = {}) {
  return {
    pilot_tenant: isPilotTenant(tenantId),
    tenant_isolated: isPilotTenant(tenantId),
    global_enforcement: false
  };
}

module.exports = { assessKpiTenantConsistency };
