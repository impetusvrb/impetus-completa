'use strict';

const { logPhaseI } = require('./phaseILogger');
const { isolateTenant, getTenantState } = require('./tenantActivationIsolation');

function promoteTenantChannel(tenantId, channel, validation = {}) {
  const id = String(tenantId);
  const current = getTenantState(id);
  const channels = { ...current.channels, [channel]: true };
  isolateTenant(id, channels);
  logPhaseI('TENANT_GOVERNANCE_PROMOTED', {
    tenant_id: id,
    channel,
    readiness_score: validation.readiness_score
  });
  return { tenant_id: id, channel, promoted: true };
}

function demoteTenantChannel(tenantId, channel) {
  const id = String(tenantId);
  const current = getTenantState(id);
  const channels = { ...current.channels };
  delete channels[channel];
  isolateTenant(id, channels);
  return { tenant_id: id, channel, demoted: true };
}

module.exports = { promoteTenantChannel, demoteTenantChannel };
