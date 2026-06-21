'use strict';

/**
 * EVENT-GOVERNANCE-13 — contrato DTO de feedback operacional (memória, sem persistência).
 */

const crypto = require('crypto');

const FEEDBACK_TYPES = Object.freeze([
  'outcome',
  'resolution',
  'false_positive',
  'escalation_success',
  'escalation_failure',
  'insight_confirmed',
  'insight_ignored',
  'insight_resolved'
]);

const OUTCOMES = Object.freeze(['success', 'failure', 'partial', 'unknown', 'pending']);

/**
 * @param {object} params
 * @returns {object}
 */
function buildGovernanceFeedbackDto(params) {
  const feedbackType = String(params.feedbackType || 'outcome');
  const outcome = String(params.outcome || 'unknown');

  return Object.freeze({
    eventId: params.eventId || crypto.randomUUID(),
    policyId: String(params.policyId || 'UNMATCHED'),
    insightId: params.insightId || null,
    sourceModule: String(params.sourceModule || 'unknown'),
    severity: String(params.severity || 'medium'),
    escalationLevel: Number.isFinite(params.escalationLevel) ? params.escalationLevel : 0,
    outcome: OUTCOMES.includes(outcome) ? outcome : 'unknown',
    feedbackType: FEEDBACK_TYPES.includes(feedbackType) ? feedbackType : 'outcome',
    timestamp: params.timestamp || new Date().toISOString(),
    companyId: params.companyId || null,
    correlationGroup: params.correlationGroup || null
  });
}

module.exports = {
  FEEDBACK_TYPES,
  OUTCOMES,
  buildGovernanceFeedbackDto
};
