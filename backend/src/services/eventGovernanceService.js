'use strict';

/**
 * EVENT-GOVERNANCE-01 — cérebro de decisão de distribuição (shadow mode).
 * Avalia eventos e produz decisões. NÃO envia, NÃO persiste, NÃO altera produtores.
 */

const crypto = require('crypto');
const observability = require('./observabilityService');
const { normalizeSeverity } = require('../governance/severityNormalizer');
const { buildGovernanceDecisionDto } = require('../governance/governanceDecisionDto');
const { getPolicies, getPolicyCount } = require('../governance/eventPolicyCatalog');

const METRIC_EVALUATIONS = 'event_governance_evaluations';
const METRIC_MATCHES = 'event_governance_policy_matches';
const METRIC_UNMATCHED = 'event_governance_unmatched';
const METRIC_SHADOW = 'event_governance_shadow_decisions';

/** @type {{ evaluations: number, matches: number, unmatched: number, shadow_decisions: number }} */
const _stats = {
  evaluations: 0,
  matches: 0,
  unmatched: 0,
  shadow_decisions: 0
};

function isEnabled() {
  return String(process.env.EVENT_GOVERNANCE_ENABLED || '').toLowerCase() === 'true';
}

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function _wildcardMatch(value, pattern) {
  const v = String(value || '').trim();
  const p = String(pattern || '').trim();
  if (!p || p === '*') return true;
  if (p.endsWith('*')) {
    return v.startsWith(p.slice(0, -1));
  }
  return v === p;
}

function _matchesList(value, list) {
  if (!list || !list.length) return true;
  return list.some((item) => _wildcardMatch(value, item));
}

function _policySpecificity(policy) {
  let score = 0;
  if (policy.eventTypes?.length) score += 4;
  if (policy.sourceModules?.length) score += 3;
  if (policy.category && policy.category !== '*') score += 2;
  if (policy.severities?.length && !policy.severities.includes('*')) score += 1;
  return score;
}

/**
 * @param {object} event
 * @param {string} normalizedSeverity
 * @returns {object|null}
 */
function matchPolicy(event, normalizedSeverity) {
  const category = String(event.category || 'general').toLowerCase();
  const eventType = String(event.eventType || 'unknown');
  const sourceModule = String(event.sourceModule || '');

  const sorted = [...getPolicies()].sort((a, b) => _policySpecificity(b) - _policySpecificity(a));

  for (const policy of sorted) {
    const policyCategory = String(policy.category || '*').toLowerCase();
    const eventCat = category || 'general';
    if (policyCategory !== '*' && policyCategory !== eventCat) continue;

    if (policy.severities?.length && !policy.severities.includes('*')) {
      if (!policy.severities.includes(normalizedSeverity)) continue;
    }

    if (policy.eventTypes?.length && !_matchesList(eventType, policy.eventTypes)) continue;
    if (policy.sourceModules?.length && !_matchesList(sourceModule, policy.sourceModules)) continue;

    return policy;
  }

  return null;
}

/**
 * Resolve recipient descriptors from policy + payload (decision only).
 * @param {object} policy
 * @param {object} event
 * @returns {object[]}
 */
function _resolveRecipients(policy, event) {
  const strategies = policy?.recipientStrategies || ['event_user'];
  const payload = event.payload || {};
  const recipients = [];

  for (const strategy of strategies) {
    const entry = { strategy: String(strategy) };
    if (strategy === 'event_user' && payload.userId) {
      entry.userId = payload.userId;
    }
    if (strategy === 'event_user' && payload.recipientUserId) {
      entry.userId = payload.recipientUserId;
    }
    if (payload.recipientUserIds && Array.isArray(payload.recipientUserIds)) {
      entry.userIds = payload.recipientUserIds;
    }
    recipients.push(entry);
  }

  return recipients;
}

/**
 * Avalia evento e produz decisão de governança (sem execução).
 * @param {object} event
 * @param {string} event.companyId
 * @param {string} [event.eventType]
 * @param {string} [event.category]
 * @param {string} [event.severity]
 * @param {string} [event.sourceModule]
 * @param {object} [event.payload]
 * @returns {object}
 */
function evaluateEvent(event) {
  if (!event || !event.companyId) {
    return {
      approved: false,
      policyId: null,
      channels: [],
      escalationLevel: 0,
      recipients: [],
      error: 'companyId obrigatório'
    };
  }

  _stats.evaluations += 1;
  _metric(METRIC_EVALUATIONS);

  const normalizedSeverity = normalizeSeverity(event.severity);
  const policy = matchPolicy(event, normalizedSeverity);
  const shadowMode = !isEnabled();

  if (shadowMode) {
    _stats.shadow_decisions += 1;
    _metric(METRIC_SHADOW);
  }

  if (!policy) {
    _stats.unmatched += 1;
    _metric(METRIC_UNMATCHED);

    const decision = buildGovernanceDecisionDto({
      eventId: event.eventId || crypto.randomUUID(),
      eventType: event.eventType,
      category: event.category,
      severity: normalizedSeverity,
      policyId: 'UNMATCHED',
      channels: [],
      escalationLevel: 0,
      recipients: [],
      generatedAt: new Date().toISOString()
    });

    return {
      approved: false,
      policyId: null,
      channels: [],
      escalationLevel: 0,
      recipients: [],
      shadowMode,
      decision
    };
  }

  _stats.matches += 1;
  _metric(METRIC_MATCHES);

  const channels = [...(policy.channels || [])];
  const payloadEscalation = event.payload?.escalationLevel;
  const escalationLevel =
    Number.isFinite(payloadEscalation) && payloadEscalation >= 1 && payloadEscalation <= 4
      ? payloadEscalation
      : (policy.escalationLevel ?? 0);
  const recipients = _resolveRecipients(policy, event);

  let confidenceScore = 0.5;
  try {
    const confidenceSvc = require('./governanceConfidenceService');
    confidenceScore = confidenceSvc.resolveDecisionConfidence({
      companyId: event.companyId,
      policyId: policy.id,
      insightId: event.payload?.insightId || event.payload?.relatedEventIds?.[0] || null
    });
  } catch {
    confidenceScore = 0.5;
  }

  const decision = buildGovernanceDecisionDto({
    eventId: event.eventId || crypto.randomUUID(),
    eventType: event.eventType,
    category: event.category || policy.category,
    severity: normalizedSeverity,
    policyId: policy.id,
    channels,
    escalationLevel,
    recipients,
    generatedAt: new Date().toISOString(),
    confidence: confidenceScore
  });

  let decisionContext = null;
  try {
    const memoryIntegration = require('./governanceMemoryIntegrationService');
    const memoryCtx = memoryIntegration.buildMemoryContext(event, policy);
    if (memoryCtx) {
      decisionContext = Object.freeze({ memory: Object.freeze(memoryCtx) });
    }
  } catch {
    /* memory enrichment optional */
  }

  return {
    approved: true,
    policyId: policy.id,
    channels,
    escalationLevel,
    recipients,
    shadowMode,
    decision,
    decisionContext
  };
}

/**
 * Status read-only para auditoria.
 */
function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  return {
    enabled: isEnabled(),
    shadow_mode: !isEnabled(),
    policies_loaded: getPolicyCount(),
    evaluations: _stats.evaluations || metrics[METRIC_EVALUATIONS] || 0,
    matches: _stats.matches || metrics[METRIC_MATCHES] || 0,
    unmatched: _stats.unmatched || metrics[METRIC_UNMATCHED] || 0,
    shadow_decisions: _stats.shadow_decisions || metrics[METRIC_SHADOW] || 0
  };
}

function resetStatsForTests() {
  _stats.evaluations = 0;
  _stats.matches = 0;
  _stats.unmatched = 0;
  _stats.shadow_decisions = 0;
}

module.exports = {
  evaluateEvent,
  getAuditStatus,
  isEnabled,
  normalizeSeverity,
  matchPolicy,
  resetStatsForTests,
  METRIC_EVALUATIONS,
  METRIC_MATCHES,
  METRIC_UNMATCHED,
  METRIC_SHADOW
};
