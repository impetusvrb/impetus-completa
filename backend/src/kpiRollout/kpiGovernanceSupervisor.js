'use strict';

const phaseT = require('./config/phaseTFeatureFlags');
const { logPhaseT } = require('./phaseTLogger');
const { getKpiGovernanceTelemetry } = require('./kpiGovernanceTelemetry');

function superviseKpiGovernance(ctx = {}) {
  if (phaseT.isKpiGovernanceObservabilityEnabled()) {
    logPhaseT('KPI_GOVERNANCE_SUPERVISION_TICK', {
      tenant_id: ctx.tenant_id,
      rollout: phaseT.isKpiGovernanceRolloutEnabled(),
      channel: phaseT.isKpiGovernanceChannelEnabled()
    });
  }
  return {
    observability: phaseT.isKpiGovernanceObservabilityEnabled(),
    rollout_enabled: phaseT.isKpiGovernanceRolloutEnabled(),
    channel_governance: phaseT.isKpiGovernanceChannelEnabled(),
    global_auto_activation: false,
    telemetry: getKpiGovernanceTelemetry()
  };
}

module.exports = { superviseKpiGovernance };
