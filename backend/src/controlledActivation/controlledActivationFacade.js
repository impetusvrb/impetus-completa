'use strict';

const phaseS = require('./config/phaseSFeatureFlags');
const { getProductionActivationStatus, assessEnterpriseReadiness } = require('./productionActivationOrchestrator');
const { governChannelActivation, governChannelDeactivation } = require('./governedChannelActivation');
const { activateChannelForTenant } = require('./tenantSafeActivation');
const { superviseTenantActivation } = require('./tenantActivationSupervisor');

function isControlledActivationLayerActive() {
  return (
    phaseS.isControlledActivationObservabilityEnabled() ||
    phaseS.isControlledRuntimeActivationEnabled() ||
    phaseS.isProductionChannelGovernanceEnabled()
  );
}

function enrichWithControlledActivation(user, legacyResponse, ctx = {}) {
  if (!isControlledActivationLayerActive() && !ctx.force) {
    return { response: legacyResponse, controlled_activation: null };
  }

  const readiness = assessEnterpriseReadiness(user, {
    visible_modules: legacyResponse.visible_modules,
    functional_axis: legacyResponse.functional_axis || legacyResponse.functional_area,
    contextual_delivery: ctx.contextual_delivery,
    precision_delivery: ctx.precision_delivery,
    runtime_consistency: ctx.runtime_consistency,
    decision_reliability: ctx.decision_reliability,
    kpi_precision: ctx.kpi_precision,
    summary_precision: ctx.summary_precision
  });

  const controlled_activation_block = {
    phase: 'S',
    shadow_only: !phaseS.isControlledRuntimeActivationEnabled(),
    observability: phaseS.isControlledActivationObservabilityEnabled(),
    status: getProductionActivationStatus({ tenant_id: user?.company_id }),
    readiness: readiness.readiness,
    rollout_health: readiness.readiness?.health,
    auto_activate: false,
    global_activation: false
  };

  return { response: legacyResponse, controlled_activation: controlled_activation_block };
}

module.exports = {
  isControlledActivationLayerActive,
  enrichWithControlledActivation,
  getProductionActivationStatus,
  assessEnterpriseReadiness,
  governChannelActivation,
  governChannelDeactivation,
  activateChannelForTenant,
  superviseTenantActivation
};
