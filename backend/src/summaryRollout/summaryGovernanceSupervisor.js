'use strict';

const phaseV = require('./config/phaseVFeatureFlags');
const { logPhaseV } = require('./phaseVLogger');
const { getSummaryGovernanceTelemetry } = require('./summaryGovernanceTelemetry');

function superviseSummaryGovernance(ctx = {}) {
  if (phaseV.isSummaryGovernanceObservabilityEnabled()) {
    logPhaseV('SUMMARY_GOVERNANCE_SUPERVISION_TICK', {
      tenant_id: ctx.tenant_id,
      rollout: phaseV.isSummaryGovernanceRolloutEnabled()
    });
  }
  return {
    observability: phaseV.isSummaryGovernanceObservabilityEnabled(),
    rollout_enabled: phaseV.isSummaryGovernanceRolloutEnabled(),
    channel_governance: phaseV.isSummaryGovernanceChannelEnabled(),
    global_auto_activation: false,
    telemetry: getSummaryGovernanceTelemetry()
  };
}

module.exports = { superviseSummaryGovernance };
