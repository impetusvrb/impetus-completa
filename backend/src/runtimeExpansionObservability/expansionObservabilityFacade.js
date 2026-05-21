'use strict';

const flags = require('../runtimeOperationalScaling/config/phaseZ11FeatureFlags');
const { buildRuntimeExpansionTimeline } = require('./runtimeExpansionTimeline');
const { buildTenantExpansionEvolution } = require('./tenantExpansionEvolution');
const { buildRolloutScalingHistory } = require('./rolloutScalingHistory');
const { buildGovernanceScalingEvolution } = require('./governanceScalingEvolution');

function consolidateExpansionObservability(tenantId, pack = {}) {
  if (!flags.isRuntimeExpansionObservabilityEnabled() && !pack.force) return null;

  return {
    phase: 'Z.11',
    tenant_id: tenantId,
    observability: true,
    timeline: buildRuntimeExpansionTimeline(tenantId, pack),
    expansion_evolution: buildTenantExpansionEvolution(pack),
    rollout_history: buildRolloutScalingHistory(tenantId),
    governance_evolution: buildGovernanceScalingEvolution(pack),
    scaling_stability: pack.scaling_stability,
    entropy: pack.governance_load_protection?.entropy,
    chat_enforcement: false,
    boundary_enforcement: false
  };
}

module.exports = { consolidateExpansionObservability };
