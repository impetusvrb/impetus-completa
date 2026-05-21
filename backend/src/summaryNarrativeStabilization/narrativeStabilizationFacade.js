'use strict';

const { runNarrativeStabilityRuntime } = require('./narrativeStabilityRuntime');
const { adviseNarrativeRecovery } = require('./summaryNarrativeRecoveryAdvisor');

function stabilizeSummaryNarrative(summaryPayload = {}, ctx = {}) {
  const stability = runNarrativeStabilityRuntime(summaryPayload, ctx);
  const recovery = adviseNarrativeRecovery(stability, ctx);
  return { phase: 'Z.9', stability, recovery, payload_unchanged: true };
}

function getNarrativeStabilizationStatus(ctx = {}) {
  const flags = require('../summaryRuntimeActivation/config/phaseZ9FeatureFlags');
  return {
    phase: 'Z.9',
    layer: 'summary-narrative-stabilization',
    enabled: flags.isSummaryNarrativeStabilizationEnabled(),
    tenant_id: ctx.tenant_id
  };
}

module.exports = { stabilizeSummaryNarrative, getNarrativeStabilizationStatus };
