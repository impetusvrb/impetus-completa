'use strict';

const { clamp01 } = require('./shared/hardeningHelpers');

function enterpriseReconnectProtectionRuntime(ctx = {}) {
  const storms = Number(ctx.reconnect_count_per_min) || 0;
  return { reconnect_storm: storms > 10, storms, stabilized: storms <= 10 };
}

function enterpriseQueueProtectionRuntime(ctx = {}) {
  const depth = Number(ctx.queue_depth) || 0;
  return { queue_explosion: depth > 5000, depth, protected: depth <= 5000 };
}

function enterpriseReplayIntegrityRuntime(ctx = {}) {
  const dup = Number(ctx.duplicate_replay_ratio) || 0;
  return { integrity_ok: dup < 0.05, duplicate_ratio: dup };
}

function enterpriseOfflineContinuityRuntime(ctx = {}) {
  const offline = Number(ctx.offline_minutes) || 0;
  const sync = ctx.sync_ok !== false;
  return { offline_collapse: offline > 120 && !sync, offline_minutes: offline, sync_ok: sync };
}

function enterpriseEdgeResilienceRuntime(ctx = {}) {
  const reconnect = enterpriseReconnectProtectionRuntime(ctx);
  const queue = enterpriseQueueProtectionRuntime(ctx);
  const replay = enterpriseReplayIntegrityRuntime(ctx);
  const offline = enterpriseOfflineContinuityRuntime(ctx);
  const ok = !reconnect.reconnect_storm && !queue.queue_explosion && replay.integrity_ok && !offline.offline_collapse;
  return {
    ok,
    reconnect,
    queue,
    replay,
    offline,
    edge_memory_protected: (ctx.edge_buffer_used || 0) < (ctx.edge_buffer_max || 5000),
    assistive_only: true
  };
}

function enterpriseEdgeHardeningRuntime(ctx = {}) {
  return enterpriseEdgeResilienceRuntime(ctx);
}

module.exports = {
  enterpriseEdgeResilienceRuntime,
  enterpriseOfflineContinuityRuntime,
  enterpriseReplayIntegrityRuntime,
  enterpriseQueueProtectionRuntime,
  enterpriseReconnectProtectionRuntime,
  enterpriseEdgeHardeningRuntime
};
