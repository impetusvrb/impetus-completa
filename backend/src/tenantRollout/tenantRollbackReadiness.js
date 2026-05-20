'use strict';

const flags = require('./config/tenantRolloutFeatureFlags');
const { logTenantRollout } = require('./tenantRolloutLogger');
const { getActiveChannels, CHANNEL_ORDER } = require('./tenantRolloutState');

function assessTenantRollbackReadiness(tenantId, health = {}, ctx = {}) {
  const active = getActiveChannels(tenantId);
  const rollback_order = [...active].reverse();

  const rollback_safe = health.healthy !== false || ctx.allow_rollback_with_warnings === true;
  const snapshot_ready = ctx.snapshot_ready !== false;

  if (!rollback_safe && flags.isTenantRolloutObservabilityEnabled()) {
    logTenantRollout('TENANT_ROLLOUT_ROLLBACK_WARNING', { tenant_id: tenantId, active_channels: active.length });
  }

  return {
    tenant_id: tenantId,
    rollback_ready: rollback_safe && snapshot_ready,
    rollback_safe,
    snapshot_readiness: snapshot_ready,
    activation_safety: active.length === 0 ? 'idle' : active.length === 3 ? 'full' : 'partial',
    rollback_plan: {
      sequence: rollback_order.length
        ? rollback_order.map((ch, i) => ({ step: i + 1, channel: ch, action: 'deactivate', auto: false }))
        : [{ step: 1, action: 'no_active_channels' }],
      channels_to_restore: CHANNEL_ORDER.filter((c) => !active.includes(c)),
      auto_rollback: false,
      human_supervision_required: true
    }
  };
}

module.exports = { assessTenantRollbackReadiness };
