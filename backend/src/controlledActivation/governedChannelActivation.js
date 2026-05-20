'use strict';

const phaseS = require('./config/phaseSFeatureFlags');
const { canActivateChannel, markChannelActivated, deactivateChannel, CHANNEL_ENV_MAP } = require('./channelActivationGovernance');

function governChannelActivation(channel, ctx = {}) {
  const check = canActivateChannel(channel, ctx);
  if (!check.allowed) {
    return { activated: false, ...check, auto_executed: false };
  }

  if (!ctx.execute || !ctx.approved_by) {
    return {
      activated: false,
      prepared: true,
      channel,
      env_flag: check.env_flag,
      instruction: `Definir ${check.env_flag}=on e pm2 reload impetus-backend --update-env`,
      requires_manual_pm2: true,
      auto_executed: false
    };
  }

  const marked = markChannelActivated(channel, { approved_by: ctx.approved_by, tenant_id: ctx.tenant_id });
  return {
    ...marked,
    activated: true,
    channel: marked.activated,
    env_flag: check.env_flag,
    enforcement_via_flag: phaseS.isProductionChannelGovernanceEnabled(),
    shadow_observability: phaseS.isControlledActivationObservabilityEnabled(),
    auto_executed: false,
    global_activation: false
  };
}

function governChannelDeactivation(channel, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return {
      deactivated: false,
      prepared: true,
      channel,
      env_flag: CHANNEL_ENV_MAP[channel],
      instruction: `Definir ${CHANNEL_ENV_MAP[channel]}=off e pm2 reload`,
      auto_executed: false
    };
  }
  const off = deactivateChannel(channel);
  return { ...off, deactivated: true, channel: off.deactivated, approved_by: ctx.approved_by };
}

module.exports = { governChannelActivation, governChannelDeactivation };
