'use strict';

const CHANNEL_ORDER = ['kpi', 'summary', 'chat', 'boundary'];

const CHANNEL_ENV_MAP = {
  kpi: 'IMPETUS_KPI_GOVERNANCE',
  summary: 'IMPETUS_SUMMARY_GOVERNANCE',
  chat: 'IMPETUS_CHAT_GOVERNANCE',
  boundary: 'IMPETUS_COGNITIVE_BOUNDARY_GUARD'
};

const _activated = new Set();

function getChannelOrder() {
  return [...CHANNEL_ORDER];
}

function getActivatedChannels() {
  return [..._activated];
}

function getNextExpectedChannel() {
  for (const ch of CHANNEL_ORDER) {
    if (!_activated.has(ch)) return ch;
  }
  return null;
}

function canActivateChannel(channel, ctx = {}) {
  const ch = String(channel).toLowerCase();
  if (!CHANNEL_ORDER.includes(ch)) {
    return { allowed: false, reason: 'unknown_channel' };
  }
  if (_activated.has(ch)) {
    return { allowed: false, reason: 'already_active', channel: ch };
  }
  const expected = getNextExpectedChannel();
  if (expected !== ch && !ctx.force_order) {
    return { allowed: false, reason: 'out_of_order', expected_next: expected, channel: ch };
  }
  if (ctx.readiness_ok === false) {
    return { allowed: false, reason: 'readiness_failed', channel: ch };
  }
  if (ctx.stability_ok === false) {
    return { allowed: false, reason: 'stability_failed', channel: ch };
  }
  return { allowed: true, channel: ch, env_flag: CHANNEL_ENV_MAP[ch] };
}

function markChannelActivated(channel, meta = {}) {
  const ch = String(channel).toLowerCase();
  _activated.add(ch);
  return { activated: ch, ...meta, at: new Date().toISOString() };
}

function deactivateChannel(channel) {
  const ch = String(channel).toLowerCase();
  _activated.delete(ch);
  return { deactivated: ch, env_flag: CHANNEL_ENV_MAP[ch], manual_env_off_required: true };
}

function resetChannelActivation() {
  _activated.clear();
}

module.exports = {
  CHANNEL_ORDER,
  CHANNEL_ENV_MAP,
  getChannelOrder,
  getActivatedChannels,
  getNextExpectedChannel,
  canActivateChannel,
  markChannelActivated,
  deactivateChannel,
  resetChannelActivation
};
