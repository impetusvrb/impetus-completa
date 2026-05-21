'use strict';

const flags = require('../runtimeGovernanceConsolidation/config/phaseZ10FeatureFlags');
const { runTenantGovernanceMaturityEngine } = require('./tenantGovernanceMaturityEngine');

function getTenantGovernanceMaturityStatus(ctx = {}) {
  return {
    phase: 'Z.10',
    layer: 'tenant-governance-maturity',
    maturity: flags.isTenantGovernanceMaturityEnabled(),
    observability: flags.isRuntimeConsolidationObservabilityEnabled(),
    tenant_id: ctx.tenant_id,
    chat_enforcement: false,
    global_activation: false
  };
}

function assessTenantGovernanceMaturity(tenantId, user = {}, ctx = {}) {
  return runTenantGovernanceMaturityEngine(tenantId, user, ctx);
}

module.exports = { getTenantGovernanceMaturityStatus, assessTenantGovernanceMaturity };
