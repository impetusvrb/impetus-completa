'use strict';

const { getTenantState, setTenantChannel } = require('./tenantRuntimeIsolation');
const { protectTenantGovernance } = require('./tenantGovernanceProtection');
const { governChannelActivation } = require('./governedChannelActivation');

function activateChannelForTenant(tenantId, channel, ctx = {}) {
  const protection = protectTenantGovernance(tenantId, ctx);
  const result = governChannelActivation(channel, { ...ctx, tenant_id: tenantId });
  if (result.activated) setTenantChannel(tenantId, channel, true);
  return { ...result, tenant: getTenantState(tenantId), protection };
}

module.exports = { activateChannelForTenant };
