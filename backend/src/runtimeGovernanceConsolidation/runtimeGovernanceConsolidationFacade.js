'use strict';

const flags = require('./config/phaseZ10FeatureFlags');
const { runRuntimeGovernanceConsolidation, isConsolidationContextActive } = require('./runtimeGovernanceConsolidation');

function getRuntimeGovernanceConsolidationStatus(ctx = {}) {
  return {
    phase: 'Z.10',
    layer: 'runtime-governance-consolidation',
    tenant_governance_maturity: flags.isTenantGovernanceMaturityEnabled(),
    runtime_sustainability: flags.isRuntimeSustainabilityEnabled(),
    governance_pressure: flags.isGovernancePressureAnalysisEnabled(),
    expansion_readiness: flags.isExpansionReadinessValidationEnabled(),
    observability: flags.isRuntimeConsolidationObservabilityEnabled(),
    chat_enforcement: false,
    boundary_enforcement: false,
    global_activation: false,
    tenant_id: ctx.tenant_id
  };
}

function applyTenantRuntimeConsolidation(user, legacyResponse = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  if (!isConsolidationContextActive(tenantId, ctx) && !flags.isRuntimeConsolidationObservabilityEnabled()) {
    return {
      response: legacyResponse,
      tenant_governance_maturity: null,
      runtime_sustainability: null,
      runtime_operational_usefulness: null
    };
  }

  const pack = runRuntimeGovernanceConsolidation(tenantId, user, legacyResponse, {
    ...ctx,
    pilot_runtime: ctx.pilot_runtime,
    pilot_operational_stabilization: ctx.pilot_operational_stabilization
  });

  return {
    response: legacyResponse,
    ...pack
  };
}

function getConsolidationReport(user = {}, ctx = {}) {
  return { ok: true, ...applyTenantRuntimeConsolidation(user, ctx.legacy || {}, ctx) };
}

module.exports = {
  getRuntimeGovernanceConsolidationStatus,
  applyTenantRuntimeConsolidation,
  getConsolidationReport
};
