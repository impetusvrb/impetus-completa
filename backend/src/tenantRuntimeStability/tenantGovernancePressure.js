'use strict';

const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');

function measureTenantGovernancePressure(tenantId) {
  const state = getTenantEnforcementState(tenantId);
  const channels = state.channels || {};
  const activeCount = Object.values(channels).filter(Boolean).length;
  const pressure = Math.min(1, activeCount * 0.22);

  return {
    channel_pressure: pressure,
    channels_active: activeCount,
    overload: activeCount >= 3 && state.enforcement_active
  };
}

module.exports = { measureTenantGovernancePressure };
