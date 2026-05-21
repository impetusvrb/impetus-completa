'use strict';

const flags = require('./config/phaseZ9FeatureFlags');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');
const { getSummaryRuntimeMeta } = require('./summaryRuntimeState');
const { assessSummaryRollbackReadiness } = require('./summaryRuntimeRollbackReadiness');

function superviseTenantSummaryRuntime(tenantId, user = {}, ctx = {}) {
  const state = getTenantEnforcementState(tenantId);
  const meta = getSummaryRuntimeMeta(tenantId);
  const rollback = assessSummaryRollbackReadiness(tenantId, ctx);

  return {
    phase: 'Z.9',
    tenant_id: tenantId,
    pilot: isPilotTenant(tenantId),
    summary_channel_active: state.channels.summary === true,
    summary_activation_active: meta.summary_activation_active === true,
    flags: {
      runtime_activation: flags.isSummaryRuntimeActivationEnabled(),
      tenant_enforcement: flags.isTenantSummaryEnforcementEnabled(),
      observability: flags.isSummaryRuntimeObservabilityEnabled()
    },
    rollback,
    chat_enforcement: false,
    global_activation: false,
    shadow_first: !state.channels.summary,
    recommendation_only: !state.channels.summary
  };
}

module.exports = { superviseTenantSummaryRuntime };
