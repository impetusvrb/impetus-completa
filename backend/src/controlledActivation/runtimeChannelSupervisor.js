'use strict';

const phaseS = require('./config/phaseSFeatureFlags');
const { logPhaseS } = require('./phaseSLogger');
const { getActivatedChannels, getNextExpectedChannel } = require('./channelActivationGovernance');

function superviseChannels(ctx = {}) {
  const activated = getActivatedChannels();
  const next = getNextExpectedChannel();
  if (phaseS.isControlledActivationObservabilityEnabled()) {
    logPhaseS('CHANNEL_SUPERVISION_TICK', { activated, next, tenant_id: ctx.tenant_id });
  }
  return {
    activated,
    next_expected: next,
    sequence_complete: !next,
    shadow_only: !phaseS.isControlledRuntimeActivationEnabled()
  };
}

module.exports = { superviseChannels };
