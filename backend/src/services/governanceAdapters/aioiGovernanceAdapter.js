'use strict';

/**
 * EVENT-GOVERNANCE-12 — adapter AIOI → Event Governance.
 * AIOI produz insights governados; Governance decide distribuição (sem envio directo).
 */

const observability = require('../observabilityService');
const eventGovernanceExecution = require('../eventGovernanceExecutionService');
const { normalizeSeverity } = require('../../governance/severityNormalizer');

const METRIC_EVENTS = 'event_governance_aioi_events';
const METRIC_CORRELATIONS = 'event_governance_aioi_correlations';
const METRIC_INSIGHTS = 'event_governance_aioi_insights';
const METRIC_SHADOW_TOTAL = 'event_governance_aioi_shadow_total';
const METRIC_SHADOW_MATCH = 'event_governance_aioi_shadow_match';

const POLICY_ID = 'AIOI_INSIGHT';

const LEGACY_CHANNELS = Object.freeze([
  'notification_center',
  'dashboard',
  'chat',
  'app_impetus'
]);

/** @type {{ events_observed: number, correlations: number, insights: number, shadow_matches: number }} */
const _stats = {
  events_observed: 0,
  correlations: 0,
  insights: 0,
  shadow_matches: 0
};

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function isAioiGovernanceEnabled() {
  return String(process.env.EVENT_GOVERNANCE_AIOI || '').toLowerCase() === 'true';
}

/**
 * @param {object} insight — governedEventInsightDto
 * @param {string} companyId
 * @returns {object}
 */
function buildGovernanceEvent(insight, companyId) {
  return {
    companyId,
    eventType: insight.eventType || 'aioi_insight_generic',
    category: 'aioi',
    severity: normalizeSeverity(insight.severity || 'medium'),
    sourceModule: 'aioiInsightService',
    payload: {
      insightType: insight.insightType,
      correlationGroup: insight.correlationGroup,
      confidence: insight.confidence,
      title: insight.title || '',
      message: insight.message || '',
      relatedEventIds: insight.relatedEventIds || [],
      correlationKind: insight.correlationKind || null,
      escalationLevel: insight.escalationLevel ?? 0,
      aioiGenerated: true
    }
  };
}

/**
 * @param {object} insight
 */
function inferLegacyDistribution(insight) {
  return {
    policyId: POLICY_ID,
    severity: normalizeSeverity(insight.severity || 'medium'),
    channels: [...LEGACY_CHANNELS],
    escalationLevel: insight.escalationLevel ?? 0,
    insightType: insight.insightType
  };
}

function _channelsEqual(a, b) {
  const setA = new Set(a || []);
  const setB = new Set(b || []);
  if (setA.size !== setB.size) return false;
  for (const ch of setA) {
    if (!setB.has(ch)) return false;
  }
  return true;
}

function compareShadow(legacy, governanceResult) {
  const evaluation = governanceResult.evaluation || {};
  const execution = governanceResult.execution || {};
  const decision = evaluation.decision || {};

  const govChannels = execution.channelsReady?.length
    ? execution.channelsReady
    : evaluation.channels || decision.channels || [];

  const govPolicy = evaluation.policyId || decision.policyId || null;
  const govEscalation = decision.escalationLevel ?? evaluation.escalationLevel ?? 0;
  const govSeverity = decision.severity || legacy.severity;

  const match =
    evaluation.approved === true &&
    govPolicy === legacy.policyId &&
    _channelsEqual(legacy.channels, govChannels) &&
    legacy.escalationLevel === govEscalation &&
    legacy.severity === govSeverity;

  return { match, legacy, governance: { policyId: govPolicy, severity: govSeverity, channels: govChannels } };
}

/**
 * AIOI não envia directamente — observação apenas (sem produtor legado).
 */
async function runLegacyDistribution() {
  return { ok: true, mode: 'observe_only', reason: 'aioi_no_direct_send' };
}

/**
 * Submete insight ao Governance para decisão de distribuição.
 * @param {object} input
 * @param {string} input.companyId
 * @param {object} input.insight
 */
async function dispatchAioiInsight(input) {
  const { companyId, insight } = input;
  if (!companyId || !insight) {
    return { skipped: true, reason: 'missing_params' };
  }

  _stats.insights += 1;
  _metric(METRIC_INSIGHTS);

  const event = buildGovernanceEvent(insight, companyId);
  const legacy = inferLegacyDistribution(insight);
  const enabled = isAioiGovernanceEnabled();

  try {
    let governanceResult;
    if (!enabled) {
      governanceResult = eventGovernanceExecution.evaluateAndPrepare(event);
    } else {
      governanceResult = await eventGovernanceExecution.evaluatePrepareAndExecute(event);
    }

    if (!enabled) {
      _metric(METRIC_SHADOW_TOTAL);
      const comparison = compareShadow(legacy, governanceResult);
      if (comparison.match) {
        _stats.shadow_matches += 1;
        _metric(METRIC_SHADOW_MATCH);
      }
      return {
        mode: 'shadow',
        observeOnly: true,
        comparison,
        governanceResult
      };
    }

    return {
      mode: 'governance',
      governanceResult,
      distribution: {
        success: governanceResult.evaluation?.approved === true,
        channels: legacy.channels
      }
    };
  } catch (err) {
    console.warn('[aioiGovernanceAdapter][dispatch]', err?.message ?? err);
    return {
      mode: 'error',
      error: err?.message || 'aioi_governance_error'
    };
  }
}

function recordObservation(delta = {}) {
  if (delta.events) {
    _stats.events_observed += delta.events;
    _metric(METRIC_EVENTS, delta.events);
  }
  if (delta.correlations) {
    _stats.correlations += delta.correlations;
    _metric(METRIC_CORRELATIONS, delta.correlations);
  }
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const enabled = isAioiGovernanceEnabled();

  return {
    enabled,
    shadow_mode: !enabled,
    events_observed: _stats.events_observed || metrics[METRIC_EVENTS] || 0,
    correlations_detected: _stats.correlations || metrics[METRIC_CORRELATIONS] || 0,
    insights_generated: _stats.insights || metrics[METRIC_INSIGHTS] || 0,
    shadow_total: metrics[METRIC_SHADOW_TOTAL] || 0,
    shadow_matches: _stats.shadow_matches || metrics[METRIC_SHADOW_MATCH] || 0,
    policy_id: POLICY_ID
  };
}

function resetStatsForTests() {
  _stats.events_observed = 0;
  _stats.correlations = 0;
  _stats.insights = 0;
  _stats.shadow_matches = 0;
}

module.exports = {
  isAioiGovernanceEnabled,
  buildGovernanceEvent,
  inferLegacyDistribution,
  compareShadow,
  dispatchAioiInsight,
  runLegacyDistribution,
  recordObservation,
  getAuditStatus,
  resetStatsForTests,
  POLICY_ID,
  LEGACY_CHANNELS,
  METRIC_EVENTS,
  METRIC_CORRELATIONS,
  METRIC_INSIGHTS,
  METRIC_SHADOW_TOTAL,
  METRIC_SHADOW_MATCH
};
