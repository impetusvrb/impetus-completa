'use strict';

const flags = require('./config/phaseZ12FeatureFlags');
const { logPhaseZ12 } = require('./phaseZ12Logger');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');
const { superviseProductionRuntimeActivation } = require('./productionRuntimeActivationSupervisor');
const { validateRuntimeActivationSafety } = require('./runtimeActivationSafetyValidator');
const { validatePm2ReloadReadiness, validateProductionDeployIntegrity } = require('./deploySafetyValidator');
const { applyProductionRuntimeStabilization } = require('../productionRuntimeStabilization/productionRuntimeStabilizationFacade');
const { assessActivationSafety } = require('../runtimeActivationSafety/activationSafetyFacade');
const { assessPilotTenantHealth } = require('../pilotTenantHealth/pilotTenantHealthFacade');
const { buildRuntimeObservationConsolidation } = require('../runtimeObservationConsolidation/runtimeObservationConsolidationFacade');

function isProductionRuntimeContextActive(tenantId, ctx = {}) {
  return isPilotTenant(tenantId) || ctx.force_production === true;
}

function getProductionRuntimeActivationStatus(ctx = {}) {
  return {
    phase: 'Z.12',
    layer: 'production-runtime-activation',
    production_activation: flags.isProductionRuntimeActivationEnabled(),
    runtime_stabilization: flags.isRuntimeStabilizationEnabled(),
    activation_safety: flags.isRuntimeActivationSafetyEnabled(),
    pilot_health: flags.isPilotHealthSupervisionEnabled(),
    observation: flags.isRuntimeObservationConsolidationEnabled(),
    chat_enforcement: false,
    boundary_enforcement: false,
    global_activation: false,
    tenant_id: ctx.tenant_id
  };
}

function applyProductionRuntimeActivation(user, legacyResponse = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  if (!isProductionRuntimeContextActive(tenantId, ctx) && !flags.isRuntimeObservationConsolidationEnabled()) {
    return {
      response: legacyResponse,
      production_runtime_activation: null,
      pilot_tenant_health: null,
      runtime_observation_consolidation: null
    };
  }

  const state = getTenantEnforcementState(tenantId);
  const supervision = superviseProductionRuntimeActivation(tenantId, user, ctx);
  const deploy = validateProductionDeployIntegrity();
  const pm2 = validatePm2ReloadReadiness(ctx);

  let z10 = {};
  let z11 = {};
  try {
    z10 = require('../runtimeGovernanceConsolidation/runtimeGovernanceConsolidationFacade').applyTenantRuntimeConsolidation(
      user,
      legacyResponse,
      ctx
    );
    z11 = require('../runtimeOperationalScaling/runtimeOperationalScalingFacade').applyRuntimeOperationalScaling(
      user,
      legacyResponse,
      ctx
    );
  } catch {
    /* optional */
  }

  const activation_safety = assessActivationSafety(tenantId, user, {
    ...ctx,
    kpi_runtime_enforcement: ctx.kpi_runtime_enforcement,
    summary_runtime_activation: ctx.summary_runtime_activation
  });

  const stabilization = applyProductionRuntimeStabilization(tenantId, {
    ...z11,
    z10,
    stability: z11.consolidation?.stability || z10.consolidation?.stability,
    governance_load_protection: z11.governance_load_protection,
    usefulness: {
      cockpit_usefulness_preserved: z10.runtime_operational_usefulness?.cockpit_usefulness_preserved
    }
  });

  const pilot_tenant_health = assessPilotTenantHealth(tenantId, {
    force: ctx.force_production,
    z10,
    z11,
    activation_safety,
    stabilization,
    usefulness: z10.runtime_operational_usefulness
  });

  const production_runtime_activation = {
    phase: 'Z.12',
    tenant_id: tenantId,
    pilot: isPilotTenant(tenantId),
    supervised: true,
    channels: state.channels,
    supervision,
    safety: validateRuntimeActivationSafety(tenantId, ctx),
    activation_safety,
    stabilization,
    deploy,
    pm2_reload: pm2,
    kpi_supervised: state.channels.kpi,
    summary_supervised: state.channels.summary,
    auto_activation: false,
    auto_remediate: false,
    chat_enforcement: false,
    boundary_enforcement: false,
    payload_legacy_preserved: true,
    recommendation_only: !flags.isProductionRuntimeActivationEnabled()
  };

  const runtime_observation_consolidation = buildRuntimeObservationConsolidation(tenantId, {
    force: ctx.force_production,
    z10,
    z11,
    activation: production_runtime_activation,
    stabilization
  });

  if (stabilization.entropy?.entropy_controlled === false && flags.isRuntimeObservationConsolidationEnabled()) {
    logPhaseZ12('RUNTIME_ENTROPY_OBSERVED', { tenant_id: tenantId });
  }

  return {
    response: legacyResponse,
    production_runtime_activation,
    pilot_tenant_health,
    runtime_observation_consolidation
  };
}

function getProductionRuntimeReport(user = {}, ctx = {}) {
  return { ok: true, ...applyProductionRuntimeActivation(user, ctx.legacy || {}, ctx) };
}

module.exports = {
  getProductionRuntimeActivationStatus,
  applyProductionRuntimeActivation,
  getProductionRuntimeReport,
  isProductionRuntimeContextActive,
  coordinatePilotProductionActivation: require('./tenantPilotActivationCoordinator').coordinatePilotProductionActivation
};
