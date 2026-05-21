'use strict';

const { runTenantExpansionReadinessEngine } = require('./tenantExpansionReadinessEngine');

function assessTenantExpansionReadiness(tenantId, pack = {}) {
  return runTenantExpansionReadinessEngine(tenantId, pack);
}

module.exports = { assessTenantExpansionReadiness };
