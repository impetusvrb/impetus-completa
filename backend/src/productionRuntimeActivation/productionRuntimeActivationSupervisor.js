'use strict';

const flags = require('./config/phaseZ12FeatureFlags');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');
const { validateRuntimeActivationSafety } = require('./runtimeActivationSafetyValidator');
const { validatePm2ReloadReadiness } = require('./deploySafetyValidator');

function superviseProductionRuntimeActivation(tenantId, user = {}, ctx = {}) {
  const state = getTenantEnforcementState(tenantId);
  const safety = validateRuntimeActivationSafety(tenantId, ctx);
  const deploy = validatePm2ReloadReadiness(ctx);

  return {
    phase: 'Z.12',
    tenant_id: tenantId,
    pilot: isPilotTenant(tenantId),
    production_activation_enabled: flags.isProductionRuntimeActivationEnabled(),
    channels: state.channels,
    safety,
    deploy,
    kpi_channel: state.channels.kpi,
    summary_channel: state.channels.summary,
    chat_enforcement: false,
    boundary_enforcement: false,
    global_activation: false,
    auto_activation: false
  };
}

module.exports = { superviseProductionRuntimeActivation };
