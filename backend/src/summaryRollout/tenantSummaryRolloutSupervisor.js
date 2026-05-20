'use strict';

const { getTenantSummaryState } = require('./tenantSummaryIsolation');
const { getSummaryRolloutStatus } = require('./summaryGovernanceActivationEngine');

function superviseTenantSummaryRollout(tenantId) {
  return {
    tenant_id: tenantId,
    state: getTenantSummaryState(tenantId),
    global_rollout: getSummaryRolloutStatus({ tenant_id: tenantId }),
    cross_tenant_blocked: true,
    gradual_rollout: true
  };
}

module.exports = { superviseTenantSummaryRollout };
