'use strict';

const flags = require('../productionRuntimeActivation/config/phaseZ12FeatureFlags');
const { buildGovernanceObservationEvolution } = require('./governanceObservationEvolution');
const { buildRolloutObservationTimeline } = require('./rolloutObservationTimeline');
const { assessOperationalObservationIntegrity } = require('./operationalObservationIntegrity');

function consolidateRuntimeObservation(tenantId, pack = {}) {
  if (!flags.isRuntimeObservationConsolidationEnabled() && !pack.force) return null;

  return {
    phase: 'Z.12',
    tenant_id: tenantId,
    observability: true,
    timeline: buildRolloutObservationTimeline(tenantId, pack),
    governance_evolution: buildGovernanceObservationEvolution(pack),
    integrity: assessOperationalObservationIntegrity(pack),
    stability: pack.z11?.tenant_expansion_maturity?.scaling_stability || pack.stabilization,
    usefulness: pack.z10?.runtime_operational_usefulness,
    entropy: pack.z11?.governance_load_protection?.entropy,
    activation: pack.activation,
    chat_enforcement: false,
    boundary_enforcement: false
  };
}

module.exports = { consolidateRuntimeObservation };
