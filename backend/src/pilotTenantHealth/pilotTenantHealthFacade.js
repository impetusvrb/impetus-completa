'use strict';

const flags = require('../productionRuntimeActivation/config/phaseZ12FeatureFlags');
const { runPilotTenantHealthEngine } = require('./pilotTenantHealthEngine');

function getPilotTenantHealthStatus(ctx = {}) {
  return {
    phase: 'Z.12',
    layer: 'pilot-tenant-health',
    supervision: flags.isPilotHealthSupervisionEnabled(),
    observability: flags.isRuntimeObservationConsolidationEnabled(),
    tenant_id: ctx.tenant_id
  };
}

function assessPilotTenantHealth(tenantId, pack = {}) {
  return runPilotTenantHealthEngine(tenantId, pack);
}

module.exports = { getPilotTenantHealthStatus, assessPilotTenantHealth };
