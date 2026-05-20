'use strict';

const _tenantState = new Map();

function tenantKey(tenantId) {
  return String(tenantId || 'global');
}

function getTenantState(tenantId) {
  const key = tenantKey(tenantId);
  if (!_tenantState.has(key)) {
    _tenantState.set(key, { channels: [], observation_only: true, activated_at: null });
  }
  return _tenantState.get(key);
}

function setTenantChannel(tenantId, channel, active) {
  const state = getTenantState(tenantId);
  if (active && !state.channels.includes(channel)) state.channels.push(channel);
  if (!active) state.channels = state.channels.filter((c) => c !== channel);
  return state;
}

function clearTenantState() {
  _tenantState.clear();
}

module.exports = { getTenantState, setTenantChannel, clearTenantState, tenantKey };
