'use strict';

/**
 * EVENT-GOVERNANCE-13 — integração passiva pós-execução Governance.
 */

const learning = require('./governanceLearningService');

function _extractDecisionMeta(event, governanceResult) {
  const evaluation = governanceResult?.evaluation || {};
  const decision = evaluation.decision || {};
  const execResult = governanceResult?.execResult || {};

  return {
    companyId: event.companyId,
    eventId: decision.eventId || event.eventId,
    policyId: evaluation.policyId || decision.policyId || 'UNMATCHED',
    insightId: event.payload?.insightId || event.payload?.relatedEventIds?.[0] || null,
    sourceModule: event.sourceModule || 'unknown',
    severity: decision.severity || event.severity || 'medium',
    escalationLevel: decision.escalationLevel ?? event.payload?.escalationLevel ?? 0,
    executionSuccess: execResult.success === true,
    approved: evaluation.approved === true
  };
}

/**
 * @param {object} event
 * @param {object} governanceResult
 */
async function onGovernanceExecution(event, governanceResult) {
  if (!event?.companyId) return { skipped: true };

  const meta = _extractDecisionMeta(event, governanceResult);
  if (!meta.approved) return { skipped: true, reason: 'not_approved' };

  const outcomeParams = {
    ...meta,
    success: meta.executionSuccess,
    outcome: meta.executionSuccess ? 'success' : 'failure'
  };

  const outcomeRecord = learning.recordOutcome(outcomeParams);

  let escalationRecord = null;
  if (meta.escalationLevel >= 2) {
    if (meta.executionSuccess) {
      escalationRecord = learning.recordEscalationSuccess(meta);
    } else {
      escalationRecord = learning.recordEscalationFailure(meta);
    }
  }

  return {
    mode: learning.isLearningEnabled() ? 'learning' : 'shadow',
    outcome: outcomeRecord,
    escalation: escalationRecord
  };
}

module.exports = {
  onGovernanceExecution,
  _extractDecisionMeta
};
