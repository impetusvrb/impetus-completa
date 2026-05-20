'use strict';

const { getTenantState } = require('./tenantRuntimeIsolation');
const { superviseChannels } = require('./runtimeChannelSupervisor');

function superviseTenantActivation(tenantId) {
  const state = getTenantState(tenantId);
  const channels = superviseChannels({ tenant_id: tenantId });
  return { tenant_id: tenantId, state, channels };
}

module.exports = { superviseTenantActivation };
