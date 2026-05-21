'use strict';

const flags = require('../productionRuntimeActivation/config/phaseZ12FeatureFlags');
const { consolidateRuntimeObservation } = require('./runtimeObservationConsolidator');

function getRuntimeObservationConsolidationStatus(ctx = {}) {
  return {
    phase: 'Z.12',
    layer: 'runtime-observation-consolidation',
    observability: flags.isRuntimeObservationConsolidationEnabled(),
    tenant_id: ctx.tenant_id
  };
}

function buildRuntimeObservationConsolidation(tenantId, pack = {}) {
  return consolidateRuntimeObservation(tenantId, pack);
}

module.exports = { getRuntimeObservationConsolidationStatus, buildRuntimeObservationConsolidation };
