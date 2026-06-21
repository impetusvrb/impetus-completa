'use strict';

/**
 * EVENT-GOVERNANCE-13 — aprendizagem AIOI sobre insights (sem notificações).
 */

const { buildGovernanceFeedbackDto } = require('../governance/governanceFeedbackDto');
const learning = require('./governanceLearningService');
const confidence = require('./governanceConfidenceService');

/**
 * @param {object} insight — governedEventInsightDto
 * @param {string} companyId
 * @param {'confirmed'|'ignored'|'resolved'} status
 */
function processInsightFeedback(insight, companyId, status) {
  const base = {
    companyId,
    eventId: insight.eventId,
    policyId: insight.policyId || 'AIOI_INSIGHT',
    insightId: insight.eventId,
    sourceModule: insight.sourceModule || 'aioiInsightService',
    severity: insight.severity || 'medium',
    escalationLevel: insight.escalationLevel ?? 0,
    correlationGroup: insight.correlationGroup || null
  };

  let recordResult;
  if (status === 'confirmed') {
    recordResult = learning.recordOutcome({ ...base, outcome: 'success' });
  } else if (status === 'ignored') {
    recordResult = learning.recordFalsePositive(base);
  } else if (status === 'resolved') {
    recordResult = learning.recordResolution(base);
  } else {
    return { ok: false, reason: 'invalid_status' };
  }

  const signal = buildLearningSignal(insight, companyId, status, recordResult);
  return { ok: true, status, signal, recordResult };
}

/**
 * @param {object} insight
 * @param {string} companyId
 * @param {string} status
 * @param {object} recordResult
 */
function buildLearningSignal(insight, companyId, status, recordResult) {
  const updatedConfidence = confidence.getObservedConfidence({
    companyId,
    policyId: insight.policyId || 'AIOI_INSIGHT',
    insightId: insight.eventId
  });

  return Object.freeze({
    insightId: insight.eventId,
    insightType: insight.insightType,
    correlationGroup: insight.correlationGroup,
    status,
    previousConfidence: insight.confidence ?? confidence.DEFAULT_CONFIDENCE,
    updatedConfidence,
    shadow: recordResult?.shadow === true,
    timestamp: new Date().toISOString()
  });
}

/**
 * @param {object[]} insights
 * @param {string} companyId
 */
function processInsightBatch(insights, companyId) {
  const signals = [];
  for (const insight of insights || []) {
    const r = processInsightFeedback(insight, companyId, 'confirmed');
    if (r.ok) signals.push(r.signal);
  }
  return signals;
}

module.exports = {
  processInsightFeedback,
  buildLearningSignal,
  processInsightBatch
};
