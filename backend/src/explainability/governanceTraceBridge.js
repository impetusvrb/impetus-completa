'use strict';

/**
 * Ponte additive Fase E/F → Fase G (trace + explainability).
 * No-op quando flags G desligadas.
 */

const phaseG = require('./config/phaseGFeatureFlags');
const { explainGovernanceDecision } = require('./governanceExplainabilityEngine');

let oversight = null;
function getOversight() {
  if (!oversight) {
    try {
      oversight = require('../oversight/governanceOversightService');
    } catch {
      oversight = null;
    }
  }
  return oversight;
}

/**
 * Regista decisão de governança a partir de qualquer canal.
 */
function recordGovernanceDecision(input = {}) {
  const anyG =
    phaseG.isGovernanceExplainabilityEnabled() ||
    phaseG.isGovernanceTraceEnabled() ||
    phaseG.isGovernanceOversightEnabled() ||
    phaseG.isGovernanceAuditFeedEnabled();

  if (!anyG && !input.force) {
    return { recorded: false, trace_id: input.trace_id || null };
  }

  const result = explainGovernanceDecision({
    ...input,
    persist: phaseG.isGovernanceTraceEnabled()
  });

  if (phaseG.isGovernanceOversightEnabled()) {
    const svc = getOversight();
    if (svc) {
      svc.processGovernanceEvent({
        ...input,
        trace_id: result.trace?.trace_id,
        decision: result.explanation?.decision,
        shadow_diverged: input.shadow_diverged,
        sanitized: input.sanitized,
        legacy: input.legacy,
        governed: input.governed,
        exposure: input.exposure
      });
    }
  }

  return {
    recorded: true,
    trace_id: result.trace?.trace_id,
    explanation: result.explanation
  };
}

module.exports = { recordGovernanceDecision, phaseG };
