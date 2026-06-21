'use strict';

/**
 * EVENT-GOVERNANCE-13 — aprendizagem operacional em memória.
 * Não altera regras produtivas, produtores ou executores.
 */

const observability = require('./observabilityService');
const { buildGovernanceFeedbackDto } = require('../governance/governanceFeedbackDto');

const METRIC_EVENTS = 'event_governance_learning_events';
const METRIC_SUCCESS = 'event_governance_learning_success';
const METRIC_FALSE_POSITIVE = 'event_governance_learning_false_positive';
const METRIC_SHADOW_TOTAL = 'event_governance_learning_shadow_total';

const MAX_RECORDS_PER_KEY = Math.max(
  50,
  parseInt(String(process.env.GOVERNANCE_LEARNING_MAX_RECORDS || '500'), 10) || 500
);

/** @type {Map<string, object[]>} */
const _records = new Map();
/** @type {object[]} */
const _shadowBuffer = [];

function isLearningEnabled() {
  return String(process.env.EVENT_GOVERNANCE_LEARNING || '').toLowerCase() === 'true';
}

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function _key(companyId, policyId, insightId) {
  return `${companyId || 'global'}:${policyId || 'unknown'}:${insightId || '*'}`;
}

function _appendRecord(key, feedback) {
  const list = _records.get(key) || [];
  list.push(feedback);
  while (list.length > MAX_RECORDS_PER_KEY) list.shift();
  _records.set(key, list);
  return feedback;
}

function _baseParams(params) {
  return {
    eventId: params.eventId,
    policyId: params.policyId,
    insightId: params.insightId || null,
    sourceModule: params.sourceModule,
    severity: params.severity,
    escalationLevel: params.escalationLevel,
    companyId: params.companyId,
    correlationGroup: params.correlationGroup || null
  };
}

/**
 * @param {object} params
 */
function recordOutcome(params) {
  const feedback = buildGovernanceFeedbackDto({
    ..._baseParams(params),
    feedbackType: 'outcome',
    outcome: params.outcome || (params.success ? 'success' : 'failure')
  });

  if (!isLearningEnabled()) {
    _shadowBuffer.push({ type: 'outcome', feedback, observedAt: new Date().toISOString() });
    _metric(METRIC_SHADOW_TOTAL);
    return { recorded: false, shadow: true, feedback };
  }

  _appendRecord(_key(params.companyId, params.policyId, params.insightId), feedback);
  _metric(METRIC_EVENTS);
  if (feedback.outcome === 'success') _metric(METRIC_SUCCESS);
  return { recorded: true, feedback };
}

function recordResolution(params) {
  const feedback = buildGovernanceFeedbackDto({
    ..._baseParams(params),
    feedbackType: 'resolution',
    outcome: 'success'
  });

  if (!isLearningEnabled()) {
    _shadowBuffer.push({ type: 'resolution', feedback });
    _metric(METRIC_SHADOW_TOTAL);
    return { recorded: false, shadow: true, feedback };
  }

  _appendRecord(_key(params.companyId, params.policyId, params.insightId), feedback);
  _metric(METRIC_EVENTS);
  _metric(METRIC_SUCCESS);
  return { recorded: true, feedback };
}

function recordFalsePositive(params) {
  const feedback = buildGovernanceFeedbackDto({
    ..._baseParams(params),
    feedbackType: 'false_positive',
    outcome: 'failure'
  });

  if (!isLearningEnabled()) {
    _shadowBuffer.push({ type: 'false_positive', feedback });
    _metric(METRIC_SHADOW_TOTAL);
    return { recorded: false, shadow: true, feedback };
  }

  _appendRecord(_key(params.companyId, params.policyId, params.insightId), feedback);
  _metric(METRIC_EVENTS);
  _metric(METRIC_FALSE_POSITIVE);
  return { recorded: true, feedback };
}

function recordEscalationSuccess(params) {
  const feedback = buildGovernanceFeedbackDto({
    ..._baseParams(params),
    feedbackType: 'escalation_success',
    outcome: 'success'
  });

  if (!isLearningEnabled()) {
    _shadowBuffer.push({ type: 'escalation_success', feedback });
    _metric(METRIC_SHADOW_TOTAL);
    return { recorded: false, shadow: true, feedback };
  }

  _appendRecord(_key(params.companyId, params.policyId, params.insightId), feedback);
  _metric(METRIC_EVENTS);
  _metric(METRIC_SUCCESS);
  return { recorded: true, feedback };
}

function recordEscalationFailure(params) {
  const feedback = buildGovernanceFeedbackDto({
    ..._baseParams(params),
    feedbackType: 'escalation_failure',
    outcome: 'failure'
  });

  if (!isLearningEnabled()) {
    _shadowBuffer.push({ type: 'escalation_failure', feedback });
    _metric(METRIC_SHADOW_TOTAL);
    return { recorded: false, shadow: true, feedback };
  }

  _appendRecord(_key(params.companyId, params.policyId, params.insightId), feedback);
  _metric(METRIC_EVENTS);
  return { recorded: true, feedback };
}

function getRecords(companyId, policyId, insightId) {
  const key = _key(companyId, policyId, insightId);
  return [...(_records.get(key) || [])];
}

function getAllRecordsForCompany(companyId) {
  const prefix = `${companyId || 'global'}:`;
  const all = [];
  for (const [k, list] of _records) {
    if (k.startsWith(prefix)) all.push(...list);
  }
  return all;
}

function getShadowBuffer() {
  return [..._shadowBuffer];
}

function resetForTests() {
  _records.clear();
  _shadowBuffer.length = 0;
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  let totalRecords = 0;
  for (const list of _records.values()) totalRecords += list.length;

  return {
    enabled: isLearningEnabled(),
    shadow_mode: !isLearningEnabled(),
    records_buffered: totalRecords,
    shadow_observations: _shadowBuffer.length,
    learning_events: metrics[METRIC_EVENTS] || 0,
    learning_success: metrics[METRIC_SUCCESS] || 0,
    learning_false_positive: metrics[METRIC_FALSE_POSITIVE] || 0,
    shadow_total: metrics[METRIC_SHADOW_TOTAL] || 0
  };
}

module.exports = {
  isLearningEnabled,
  recordOutcome,
  recordResolution,
  recordFalsePositive,
  recordEscalationSuccess,
  recordEscalationFailure,
  getRecords,
  getAllRecordsForCompany,
  getShadowBuffer,
  resetForTests,
  getAuditStatus,
  METRIC_EVENTS,
  METRIC_SUCCESS,
  METRIC_FALSE_POSITIVE,
  METRIC_SHADOW_TOTAL
};
