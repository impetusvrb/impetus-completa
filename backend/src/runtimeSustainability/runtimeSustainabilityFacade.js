'use strict';

const flags = require('../runtimeGovernanceConsolidation/config/phaseZ10FeatureFlags');
const { runRuntimeSustainabilityEngine } = require('./runtimeSustainabilityEngine');

function getRuntimeSustainabilityStatus(ctx = {}) {
  return {
    phase: 'Z.10',
    layer: 'runtime-sustainability',
    sustainability: flags.isRuntimeSustainabilityEnabled(),
    observability: flags.isRuntimeConsolidationObservabilityEnabled(),
    tenant_id: ctx.tenant_id
  };
}

function assessRuntimeSustainability(tenantId, pack = {}, ctx = {}) {
  return runRuntimeSustainabilityEngine(tenantId, pack, ctx);
}

module.exports = { getRuntimeSustainabilityStatus, assessRuntimeSustainability };
