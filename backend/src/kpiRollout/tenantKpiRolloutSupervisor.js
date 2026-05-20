'use strict';

const { getTenantKpiState } = require('./tenantKpiIsolation');
const { getKpiRolloutStatus } = require('./kpiGovernanceActivationEngine');

function superviseTenantKpiRollout(tenantId) {
  const state = getTenantKpiState(tenantId);
  const global = getKpiRolloutStatus({ tenant_id: tenantId });
  return {
    tenant_id: tenantId,
    state,
    global_rollout: global,
    cross_tenant_blocked: true,
    gradual_rollout: true
  };
}

module.exports = { superviseTenantKpiRollout };
