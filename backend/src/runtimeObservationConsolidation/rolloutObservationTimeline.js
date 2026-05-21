'use strict';

const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');

function buildRolloutObservationTimeline(tenantId, pack = {}) {
  const state = getTenantEnforcementState(tenantId);
  const events = [];
  if (state.activated_at) {
    events.push({ at: state.activated_at, type: 'tenant_enforcement', channels: state.channels });
  }
  if (pack.activation?.supervised) {
    events.push({ at: new Date().toISOString(), type: 'production_activation_observed', tenant_id: tenantId });
  }
  return { tenant_id: tenantId, events, phase: 'Z.12' };
}

module.exports = { buildRolloutObservationTimeline };
