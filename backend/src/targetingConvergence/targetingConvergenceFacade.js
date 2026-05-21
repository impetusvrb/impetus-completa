'use strict';

const { assessTenantTargetingConvergence } = require('./tenantTargetingConvergence');

function getTargetingConvergenceStatus(ctx = {}) {
  return {
    phase: 'Z.4',
    layer: 'targeting-convergence',
    tenant_id: ctx.tenant_id
  };
}

module.exports = {
  getTargetingConvergenceStatus,
  assessTenantTargetingConvergence
};
