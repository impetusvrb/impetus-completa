'use strict';

const { logPhaseJ } = require('./phaseJLogger');

function prepareEmergencyIsolation(ctx = {}) {
  const tenantId = ctx.tenant_id || null;
  const plan = {
    type: 'emergency_isolation',
    tenant_id: tenantId,
    auto_executed: false,
    containment: tenantId
      ? {
          demote_all_channels: true,
          endpoint: 'POST /api/internal/governance/demote/:channel',
          tenant_scope: tenantId
        }
      : {
          disable_controlled_activation: true,
          demote_global_channels: true
        },
    requires_approval: true
  };

  logPhaseJ('GOVERNANCE_EMERGENCY_ISOLATION_PREPARED', { tenant_id: tenantId });

  return plan;
}

module.exports = { prepareEmergencyIsolation };
