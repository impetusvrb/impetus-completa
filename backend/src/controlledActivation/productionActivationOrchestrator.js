'use strict';

const phaseS = require('./config/phaseSFeatureFlags');
const { coordinateActivationReadiness } = require('./runtimeActivationCoordinator');
const { superviseChannels } = require('./runtimeChannelSupervisor');
const { superviseTenantActivation } = require('./tenantActivationSupervisor');
const { getRolloutPlan } = require('./controlledRolloutManager');
const { getActivationTelemetry } = require('./productionActivationTelemetry');

function getProductionActivationStatus(ctx = {}) {
  return {
    phase: 'S',
    observability: phaseS.isControlledActivationObservabilityEnabled(),
    controlled_activation: phaseS.isControlledRuntimeActivationEnabled(),
    channel_governance: phaseS.isProductionChannelGovernanceEnabled(),
    global_auto_activation: false,
    flags: {
      IMPETUS_CONTROLLED_RUNTIME_ACTIVATION: phaseS.isControlledRuntimeActivationEnabled(),
      IMPETUS_PRODUCTION_CHANNEL_GOVERNANCE: phaseS.isProductionChannelGovernanceEnabled(),
      IMPETUS_RUNTIME_DELIVERY_VALIDATION: phaseS.isRuntimeDeliveryValidationEnabled(),
      IMPETUS_RUNTIME_STABILIZATION_MONITOR: phaseS.isRuntimeStabilizationMonitorEnabled(),
      IMPETUS_CONTROLLED_ACTIVATION_OBSERVABILITY: phaseS.isControlledActivationObservabilityEnabled()
    },
    channels: superviseChannels(ctx),
    rollout: getRolloutPlan(ctx.tenant_id),
    telemetry: getActivationTelemetry()
  };
}

function assessEnterpriseReadiness(user, ctx = {}) {
  const readiness = coordinateActivationReadiness(user, ctx);
  let phasesEr = { ok: true };
  try {
    const report = require('../decisionReliability/decisionReliabilityFacade').getReliabilityReport();
    phasesEr = { ok: true, telemetry: report.telemetry };
  } catch {
    phasesEr = { ok: false, note: 'decision_reliability_unavailable' };
  }
  return {
    e_to_r_ready: readiness.readiness_ok && phasesEr.ok,
    readiness,
    phases_er: phasesEr,
    shadow_first: true,
    auto_activate: false
  };
}

module.exports = { getProductionActivationStatus, assessEnterpriseReadiness, coordinateActivationReadiness };
