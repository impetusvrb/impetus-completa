'use strict';

const flags = require('./config/tenantRolloutFeatureFlags');
const { measureTenantGovernanceHealth } = require('./tenantGovernanceHealth');
const { observeTenantRuntime } = require('./tenantRuntimeObservation');
const { assessTenantRollbackReadiness } = require('./tenantRollbackReadiness');
const {
  coordinateTenantActivation,
  coordinateTenantDeactivation,
  getNextChannelForTenant
} = require('./tenantActivationCoordinator');
const { getTenantRolloutState, getActiveChannels, CHANNEL_ORDER } = require('./tenantRolloutState');
const { getTenantRolloutTelemetry } = require('./tenantRolloutTelemetry');

function superviseTenantRollout(tenantId, user, ctx = {}) {
  const health = measureTenantGovernanceHealth(tenantId, ctx);
  const observation = observeTenantRuntime(tenantId, ctx);
  const rollback = assessTenantRollbackReadiness(tenantId, health, ctx);

  const stable =
    health.healthy &&
    !observation.runtime_degradation &&
    observation.instability_score >= 0.7;

  const next_channel = getNextChannelForTenant(tenantId);
  const validation_passed = stable || ctx.force === true;

  return {
    tenant_id: tenantId,
    stable,
    validation_passed,
    health,
    observation,
    rollback,
    activation_order: CHANNEL_ORDER,
    active_channels: getActiveChannels(tenantId),
    next_channel,
    state: getTenantRolloutState(tenantId),
    rollout_safe: stable && rollback.rollback_ready,
    auto_activation: false,
    observability: flags.isTenantRolloutObservabilityEnabled()
  };
}

function activateTenantRollout(tenantId, user, ctx = {}) {
  const supervision = superviseTenantRollout(tenantId, user, ctx);
  const channel = ctx.channel || supervision.next_channel;

  if (!channel) {
    return {
      ok: false,
      reason: 'all_channels_active',
      tenant_id: tenantId,
      active: supervision.active_channels,
      auto_activation: false
    };
  }

  const result = coordinateTenantActivation(tenantId, channel, user, {
    ...ctx,
    health: supervision.health,
    readiness_ok: supervision.validation_passed,
    stability_ok: supervision.stable
  });

  return {
    ...supervision,
    active_channels: getActiveChannels(tenantId),
    next_channel: getNextChannelForTenant(tenantId),
    activation: result
  };
}

function deactivateTenantRollout(tenantId, ctx = {}) {
  const supervision = superviseTenantRollout(tenantId, null, ctx);
  const channel = ctx.channel || supervision.active_channels.slice(-1)[0];
  const result = coordinateTenantDeactivation(tenantId, channel, ctx);
  return {
    ...supervision,
    active_channels: getActiveChannels(tenantId),
    next_channel: getNextChannelForTenant(tenantId),
    deactivation: result
  };
}

function getTenantRolloutStatus() {
  return {
    layer: 'tenant-cognitive-rollout',
    cognitive_rollout: flags.isTenantCognitiveRolloutEnabled(),
    activation: flags.isTenantRolloutActivationEnabled(),
    observability: flags.isTenantRolloutObservabilityEnabled(),
    channel_sequence: CHANNEL_ORDER,
    global_auto_activation: false,
    telemetry: getTenantRolloutTelemetry()
  };
}

module.exports = {
  superviseTenantRollout,
  activateTenantRollout,
  deactivateTenantRollout,
  getTenantRolloutStatus
};
