'use strict';

const { logPhaseI } = require('./phaseILogger');

/** tenant_id -> { channels: { kpi: true }, promoted_at } */
const _tenantChannels = new Map();

function tenantAllowsChannel(tenantId, channel) {
  if (!tenantId) return false;
  const state = _tenantChannels.get(String(tenantId));
  return !!(state && state.channels && state.channels[channel]);
}

function isolateTenant(tenantId, channels = {}) {
  const id = String(tenantId);
  _tenantChannels.set(id, {
    channels: { ...channels },
    isolated_at: new Date().toISOString()
  });
  logPhaseI('TENANT_GOVERNANCE_ISOLATED', { tenant_id: id, channels: Object.keys(channels) });
  return _tenantChannels.get(id);
}

function getTenantState(tenantId) {
  return _tenantChannels.get(String(tenantId)) || { channels: {} };
}

function clearTenant(tenantId) {
  _tenantChannels.delete(String(tenantId));
}

function clearAllForTests() {
  _tenantChannels.clear();
}

module.exports = {
  tenantAllowsChannel,
  isolateTenant,
  getTenantState,
  clearTenant,
  clearAllForTests
};
