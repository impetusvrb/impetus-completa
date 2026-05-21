'use strict';

const flags = require('../summaryRuntimeActivation/config/phaseZ9FeatureFlags');
const { buildSummaryRuntimeTimeline } = require('./summaryRuntimeTimeline');
const { buildSummaryGovernanceEvolution } = require('./summaryGovernanceEvolution');
const { assessSummaryRuntimeHealth } = require('./summaryRuntimeHealth');
const { getSummaryRollbackObservability } = require('./summaryRollbackReadiness');

function consolidateSummaryRuntimeObservability(tenantId, pack = {}) {
  if (!flags.isSummaryRuntimeObservabilityEnabled() && !pack.force) {
    return null;
  }
  const health = assessSummaryRuntimeHealth(pack);
  return {
    phase: 'Z.9',
    tenant_id: tenantId,
    observability: true,
    timeline: buildSummaryRuntimeTimeline(tenantId, pack),
    evolution: buildSummaryGovernanceEvolution(tenantId, pack),
    health,
    rollback: getSummaryRollbackObservability(tenantId, pack.ctx),
    chat_enforcement: false
  };
}

module.exports = { consolidateSummaryRuntimeObservability };
