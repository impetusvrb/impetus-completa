'use strict';

const flags = require('./config/tenantRolloutFeatureFlags');
const { logTenantRollout } = require('./tenantRolloutLogger');
const { recordActivation, recordBlocked } = require('./tenantRolloutTelemetry');
const {
  CHANNEL_ORDER,
  isChannelActive,
  setTenantChannelActive,
  getNextChannelForTenant,
  getActiveChannels
} = require('./tenantRolloutState');

function canActivateChannelForTenant(tenantId, channel, ctx = {}) {
  const ch = String(channel).toLowerCase();
  if (!CHANNEL_ORDER.includes(ch)) return { allowed: false, reason: 'unknown_channel' };
  if (isChannelActive(tenantId, ch)) return { allowed: false, reason: 'already_active', channel: ch };

  const expected = getNextChannelForTenant(tenantId);
  if (expected !== ch && !ctx.force_order) {
    logTenantRollout('TENANT_COGNITIVE_CHANNEL_OUT_OF_ORDER', {
      tenant_id: tenantId,
      expected,
      requested: ch,
      shadow_only: true
    });
    recordBlocked();
    return { allowed: false, reason: 'out_of_order', expected_next: expected, channel: ch };
  }

  if (ctx.health?.healthy === false && !ctx.force) {
    recordBlocked();
    return { allowed: false, reason: 'tenant_health_low', channel: ch };
  }

  return { allowed: true, channel: ch, sequence_position: CHANNEL_ORDER.indexOf(ch) + 1 };
}

function _activateKpi(tenantId, user, ctx) {
  const engine = require('../kpiRollout/kpiGovernanceActivationEngine');
  return engine.activateKpiGovernance(user, ctx.kpi_payload || { kpis: [] }, {
    ...ctx,
    tenant_id: tenantId,
    execute: ctx.execute,
    approved_by: ctx.approved_by
  });
}

function _activateSummary(tenantId, user, ctx) {
  const engine = require('../summaryRollout/summaryGovernanceActivationEngine');
  return engine.activateSummaryGovernance(user, ctx.summary_payload || {}, {
    ...ctx,
    tenant_id: tenantId,
    execute: ctx.execute,
    approved_by: ctx.approved_by,
    skip_kpi_prerequisite: ctx.force_order === true
  });
}

function _activateChat(tenantId, user, ctx) {
  if (!ctx.execute || !ctx.approved_by) {
    return {
      activated: false,
      prepared: true,
      channel: 'chat',
      instruction: 'IMPETUS_CHAT_GOVERNANCE=on; pm2 reload — supervisão humana',
      auto_executed: false
    };
  }

  let channelCoord = null;
  try {
    const ca = require('../controlledActivation/controlledActivationFacade');
    channelCoord = ca.activateChannelForTenant(tenantId, 'chat', {
      execute: true,
      approved_by: ctx.approved_by,
      readiness_ok: ctx.readiness_ok !== false,
      stability_ok: ctx.stability_ok !== false
    });
  } catch {
    channelCoord = { note: 'controlled_activation_skipped' };
  }

  setTenantChannelActive(tenantId, 'chat', true, { approved_by: ctx.approved_by });

  if (flags.isTenantRolloutObservabilityEnabled()) {
    logTenantRollout('TENANT_ROLLOUT_ACTIVATED', {
      tenant_id: tenantId,
      channel: 'chat',
      shadow_only: !flags.isTenantRolloutActivationEnabled()
    });
  }

  return {
    activated: true,
    channel: 'chat',
    tenant_id: tenantId,
    channel_coordination: channelCoord,
    auto_executed: false
  };
}

function _deactivateKpi(tenantId, ctx) {
  const engine = require('../kpiRollout/kpiGovernanceActivationEngine');
  return engine.deactivateKpiGovernance({ ...ctx, tenant_id: tenantId });
}

function _deactivateSummary(tenantId, ctx) {
  const engine = require('../summaryRollout/summaryGovernanceActivationEngine');
  return engine.deactivateSummaryGovernance({ ...ctx, tenant_id: tenantId });
}

function _deactivateChat(tenantId, ctx) {
  if (!ctx.execute || !ctx.approved_by) {
    return { deactivated: false, prepared: true, channel: 'chat', auto_executed: false };
  }
  try {
    const ca = require('../controlledActivation/controlledActivationFacade');
    ca.governChannelDeactivation('chat', { execute: true, approved_by: ctx.approved_by, tenant_id: tenantId });
  } catch {
    /* optional */
  }
  setTenantChannelActive(tenantId, 'chat', false, { approved_by: ctx.approved_by });
  return { deactivated: true, channel: 'chat', tenant_id: tenantId, auto_executed: false };
}

function coordinateTenantActivation(tenantId, channel, user, ctx = {}) {
  const seq = canActivateChannelForTenant(tenantId, channel, ctx);
  if (!seq.allowed) {
    return { ok: false, ...seq, auto_activation: false };
  }

  if (!ctx.execute || !ctx.approved_by) {
    logTenantRollout('TENANT_ROLLOUT_PLANNED', { tenant_id: tenantId, channel, approved_by: ctx.approved_by });
    return {
      ok: true,
      prepared: true,
      channel,
      tenant_id: tenantId,
      sequence: CHANNEL_ORDER,
      active: getActiveChannels(tenantId),
      next_after: getNextChannelForTenant(tenantId),
      requires_execute: true,
      auto_activation: false
    };
  }

  if (!flags.isTenantRolloutActivationEnabled() && !ctx.force_activation) {
    recordBlocked();
    return {
      ok: false,
      error: 'IMPETUS_TENANT_ROLLOUT_ACTIVATION=off',
      channel,
      tenant_id: tenantId,
      auto_activation: false
    };
  }

  let result;
  const ch = seq.channel;
  if (ch === 'kpi') result = _activateKpi(tenantId, user, ctx);
  else if (ch === 'summary') result = _activateSummary(tenantId, user, ctx);
  else result = _activateChat(tenantId, user, ctx);

  if (result.activated) {
    setTenantChannelActive(tenantId, ch, true, { approved_by: ctx.approved_by });
    recordActivation();
    logTenantRollout('TENANT_ROLLOUT_ACTIVATED', {
      tenant_id: tenantId,
      channel: ch,
      approved_by: ctx.approved_by,
      shadow_only: !flags.isTenantCognitiveRolloutEnabled()
    });
  } else if (result.prepared) {
    logTenantRollout('TENANT_ROLLOUT_PLANNED', { tenant_id: tenantId, channel: ch });
  } else {
    recordBlocked();
    logTenantRollout('TENANT_ROLLOUT_BLOCKED', { tenant_id: tenantId, channel: ch, reason: result.reason });
  }

  return {
    ok: result.activated || result.prepared,
    channel: ch,
    tenant_id: tenantId,
    active: getActiveChannels(tenantId),
    ...result,
    auto_activation: false
  };
}

function coordinateTenantDeactivation(tenantId, channel, ctx = {}) {
  const ch = channel || getActiveChannels(tenantId).slice(-1)[0];
  if (!ch) {
    return { ok: false, reason: 'no_active_channel', tenant_id: tenantId };
  }

  if (!ctx.execute || !ctx.approved_by) {
    return {
      ok: true,
      prepared: true,
      channel: ch,
      tenant_id: tenantId,
      requires_execute: true,
      auto_activation: false
    };
  }

  let result;
  if (ch === 'chat') result = _deactivateChat(tenantId, ctx);
  else if (ch === 'summary') result = _deactivateSummary(tenantId, ctx);
  else result = _deactivateKpi(tenantId, ctx);

  if (result.deactivated) {
    setTenantChannelActive(tenantId, ch, false, { approved_by: ctx.approved_by });
    require('./tenantRolloutTelemetry').recordDeactivation();
  }

  return {
    ok: result.deactivated || result.prepared,
    channel: ch,
    tenant_id: tenantId,
    active: getActiveChannels(tenantId),
    ...result,
    auto_activation: false
  };
}

module.exports = {
  CHANNEL_ORDER,
  canActivateChannelForTenant,
  coordinateTenantActivation,
  coordinateTenantDeactivation,
  getNextChannelForTenant
};
