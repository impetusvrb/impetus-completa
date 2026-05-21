'use strict';

const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');

function assessTenantRuntimeMaturity(tenantId, ctx = {}) {
  const state = getTenantEnforcementState(tenantId);
  const channels = state.channels || {};
  const active = ['menu', 'kpi', 'summary'].filter((c) => channels[c]).length;
  const progressive = state.progressive_step || 0;

  return {
    channels_active: active,
    progressive_step: progressive,
    runtime_maturity_score: Math.min(1, active * 0.25 + progressive * 0.05),
    enforcement_active: state.enforcement_active === true
  };
}

module.exports = { assessTenantRuntimeMaturity };
