'use strict';

const { getChannelOrder, getActivatedChannels, getNextExpectedChannel } = require('./channelActivationGovernance');
const { activateChannelForTenant } = require('./tenantSafeActivation');

function getRolloutPlan(tenantId) {
  return {
    tenant_id: tenantId,
    sequence: getChannelOrder(),
    activated: getActivatedChannels(),
    next: getNextExpectedChannel(),
    global_auto: false
  };
}

function planTenantChannelActivation(tenantId, channel, ctx = {}) {
  return activateChannelForTenant(tenantId, channel, { ...ctx, execute: false });
}

module.exports = { getRolloutPlan, planTenantChannelActivation };
