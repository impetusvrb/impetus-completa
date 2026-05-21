'use strict';

const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');

function assessTenantKpiTargetingIntegrity(tenantId) {
  return { pilot_tenant: isPilotTenant(tenantId), tenant_isolated: isPilotTenant(tenantId), global_targeting: false };
}

module.exports = { assessTenantKpiTargetingIntegrity };
