'use strict';

const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');

function buildGovernanceEvolutionTimeline(tenantId, pack = {}) {
  const state = getTenantEnforcementState(tenantId);
  const events = [];
  if (state.activated_at) {
    events.push({ at: state.activated_at, type: 'enforcement_activated', channels: state.channels });
  }
  if (pack.maturity?.maturity_score != null) {
    events.push({ at: new Date().toISOString(), type: 'maturity_observed', score: pack.maturity.maturity_score });
  }
  return { tenant_id: tenantId, events, phase: 'Z.10' };
}

module.exports = { buildGovernanceEvolutionTimeline };
