'use strict';

const CHANNEL_ORDER = ['kpi', 'summary', 'chat'];
const _tenants = new Map();

function tenantKey(tenantId) {
  return String(tenantId || 'global');
}

function defaultState() {
  return {
    channels: { kpi: false, summary: false, chat: false },
    activated_at: null,
    approved_by: null,
    observation_only: true,
    last_channel: null
  };
}

function getTenantRolloutState(tenantId) {
  const key = tenantKey(tenantId);
  if (!_tenants.has(key)) _tenants.set(key, defaultState());
  return _tenants.get(key);
}

function isChannelActive(tenantId, channel) {
  const s = getTenantRolloutState(tenantId);
  return !!s.channels[channel];
}

function setTenantChannelActive(tenantId, channel, active, meta = {}) {
  const ch = String(channel).toLowerCase();
  if (!CHANNEL_ORDER.includes(ch)) return { ok: false, reason: 'unknown_channel' };
  const s = getTenantRolloutState(tenantId);
  s.channels[ch] = !!active;
  if (active) {
    s.activated_at = new Date().toISOString();
    s.approved_by = meta.approved_by || null;
    s.observation_only = false;
    s.last_channel = ch;
  }
  return { ok: true, state: s, channel: ch };
}

function getActiveChannels(tenantId) {
  const s = getTenantRolloutState(tenantId);
  return CHANNEL_ORDER.filter((c) => s.channels[c]);
}

function getNextChannelForTenant(tenantId) {
  const s = getTenantRolloutState(tenantId);
  for (const ch of CHANNEL_ORDER) {
    if (!s.channels[ch]) return ch;
  }
  return null;
}

function getLastActiveChannel(tenantId) {
  const active = getActiveChannels(tenantId);
  return active.length ? active[active.length - 1] : null;
}

function clearTenantRolloutState() {
  _tenants.clear();
}

module.exports = {
  CHANNEL_ORDER,
  getTenantRolloutState,
  isChannelActive,
  setTenantChannelActive,
  getActiveChannels,
  getNextChannelForTenant,
  getLastActiveChannel,
  clearTenantRolloutState
};
