'use strict';

const phaseG = require('../explainability/config/phaseGFeatureFlags');
const { detectConflicts } = require('./governanceConflictDetector');
const { escalateIfNeeded } = require('./governanceEscalationService');
const { detectDrift, recordSample } = require('./governanceDriftDetector');
const shadowReview = require('../policyEngine/observability/governanceShadowReview');

/**
 * Orquestra oversight: conflitos, drift, shadow review.
 */
function processGovernanceEvent(event = {}) {
  if (!phaseG.isGovernanceOversightEnabled() && !event.force) {
    return { enabled: false };
  }

  const conflictResult = detectConflicts(event);
  const shadowMetrics = shadowReview.evaluateShadowReview(event.shadow || {});

  recordSample({
    decision: event.decision,
    shadow_diverged: event.shadow_diverged,
    sanitized: event.sanitized,
    channel: event.channel
  });

  const drift = detectDrift();

  let escalation = { escalated: false };
  if (conflictResult.has_conflicts) {
    const high = conflictResult.conflicts.some((c) => c.severity === 'high');
    escalation = escalateIfNeeded({
      severity: high ? 'high' : 'medium',
      type: 'policy_conflict',
      channel: event.channel,
      user_id: event.user_id,
      trace_id: event.trace_id,
      detail: conflictResult
    });
  }

  if (drift.drift_detected) {
    escalateIfNeeded({
      severity: 'medium',
      type: 'governance_drift',
      channel: event.channel,
      user_id: event.user_id,
      trace_id: event.trace_id,
      detail: drift
    });
  }

  return {
    enabled: true,
    conflicts: conflictResult,
    shadow_review: shadowMetrics,
    drift,
    escalation
  };
}

module.exports = { processGovernanceEvent, phaseG };
