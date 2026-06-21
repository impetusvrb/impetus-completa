'use strict';

/**
 * EVENT-GOVERNANCE-11B — adapter SST → Event Governance.
 * Orquestra distribuição com escalonamento ocupacional (níveis 1–4).
 * Workflow, investigações, CAT, APR/PT e indicadores permanecem inalterados.
 */

const observability = require('../observabilityService');
const eventGovernanceExecution = require('../eventGovernanceExecutionService');
const { normalizeSeverity } = require('../../governance/severityNormalizer');
const {
  SST_ESCALATION_LEVELS,
  resolveEscalationLevel,
  mapEventTypeToLifecyclePhase
} = require('../sstNotificationService');

const METRIC_EVENTS = 'event_governance_sst_events';
const METRIC_MIGRATED = 'event_governance_sst_migrated';
const METRIC_SHADOW_TOTAL = 'event_governance_sst_shadow_total';
const METRIC_SHADOW_MATCH = 'event_governance_sst_shadow_match';
const METRIC_SHADOW_DIVERGENCE = 'event_governance_sst_shadow_divergence';

const POLICY_ID = 'SST_LIFECYCLE';

const LEGACY_CHANNELS = Object.freeze([
  'notification_center',
  'dashboard',
  'chat',
  'app_impetus'
]);

/** @type {{ events_evaluated: number, matches: number, divergences: number, migrated: number }} */
const _stats = {
  events_evaluated: 0,
  matches: 0,
  divergences: 0,
  migrated: 0
};

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function isSstGovernanceEnabled() {
  return String(process.env.EVENT_GOVERNANCE_SST || '').toLowerCase() === 'true';
}

/**
 * @param {object} input
 * @returns {object}
 */
function buildGovernanceEvent(input) {
  const eventType = input.eventType || 'sst_generic';
  const lifecyclePhase = input.lifecyclePhase || mapEventTypeToLifecyclePhase(eventType, input.severity);
  const severity = normalizeSeverity(input.severity || 'medium');
  const escalationLevel = input.escalationLevel ?? resolveEscalationLevel(lifecyclePhase, severity);

  return {
    companyId: input.companyId,
    eventType,
    category: 'sst',
    severity,
    sourceModule: 'sstNotificationService',
    payload: {
      lifecyclePhase,
      eventType,
      escalationLevel,
      title: input.title || '',
      message: input.message || input.body || '',
      incidentId: input.incidentId || null,
      recipientUserIds: input.recipientUserIds || [],
      tipo_alerta: input.tipo_alerta || null,
      source: input.source || null
    }
  };
}

/**
 * @param {object} input
 */
function inferLegacyDistribution(input) {
  const eventType = input.eventType || 'sst_generic';
  const lifecyclePhase = mapEventTypeToLifecyclePhase(eventType, input.severity);
  const severity = normalizeSeverity(input.severity || 'medium');
  const escalationLevel = resolveEscalationLevel(lifecyclePhase, severity);

  return {
    policyId: POLICY_ID,
    lifecyclePhase,
    severity,
    channels: [...LEGACY_CHANNELS],
    escalationLevel,
    recipientCount: Array.isArray(input.recipientUserIds) ? input.recipientUserIds.length : 0,
    escalationLabel: SST_ESCALATION_LEVELS[escalationLevel]?.label || null
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

/**
 * @param {object} legacy
 * @param {object} governanceResult
 */
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

  const policyMatch = govPolicy === legacy.policyId;
  const channelsMatch = _channelsEqual(legacy.channels, govChannels);
  const escalationMatch = legacy.escalationLevel === govEscalation;
  const severityMatch = legacy.severity === govSeverity;

  const match =
    evaluation.approved === true &&
    policyMatch &&
    channelsMatch &&
    escalationMatch &&
    severityMatch;

  return {
    match,
    legacy,
    governance: {
      policyId: govPolicy,
      severity: govSeverity,
      channels: govChannels,
      escalationLevel: govEscalation,
      approved: evaluation.approved
    },
    divergence: match
      ? null
      : {
          policy: !policyMatch,
          channels: !channelsMatch,
          escalation: !escalationMatch,
          severity: !severityMatch
        }
  };
}

/**
 * Fluxo legado — NC + escalonamento SST.
 * @param {object} input
 */
async function runLegacyDistribution(input) {
  const sst = require('../sstNotificationService');
  return sst.executeLegacyDistribution(input);
}

/**
 * @param {object} input
 * @param {object} governanceResult
 */
async function _executeGovernanceDistribution(input, governanceResult) {
  const evaluation = governanceResult.evaluation || {};
  if (evaluation.approved !== true) {
    return { success: false, reason: 'not_approved' };
  }

  const result = await runLegacyDistribution(input);
  return {
    success: result.ok === true,
    channels: LEGACY_CHANNELS,
    result
  };
}

/**
 * @param {object} input
 */
async function dispatchSstNotification(input) {
  if (!input.companyId) {
    return { skipped: true, reason: 'missing_companyId', useLegacy: true };
  }

  if (!input.title && !input.message && !input.eventType) {
    return { skipped: true, reason: 'missing_content', useLegacy: true };
  }

  _stats.events_evaluated += 1;
  _metric(METRIC_EVENTS);

  const migrated = isSstGovernanceEnabled();
  const event = buildGovernanceEvent(input);
  const legacy = inferLegacyDistribution(input);

  try {
    const governanceResult = await eventGovernanceExecution.evaluatePrepareAndExecute(event);

    if (!migrated) {
      _metric(METRIC_SHADOW_TOTAL);
      const comparison = compareShadow(legacy, governanceResult);

      if (comparison.match) {
        _stats.matches += 1;
        _metric(METRIC_SHADOW_MATCH);
      } else {
        _stats.divergences += 1;
        _metric(METRIC_SHADOW_DIVERGENCE);
      }

      return {
        mode: 'shadow',
        useLegacy: true,
        comparison,
        governanceResult
      };
    }

    _stats.migrated += 1;
    _metric(METRIC_MIGRATED);

    const distribution = await _executeGovernanceDistribution(input, governanceResult);

    return {
      mode: 'governance',
      useLegacy: !distribution.success,
      governanceResult,
      distribution
    };
  } catch (err) {
    console.warn('[sstGovernanceAdapter][dispatch]', err?.message ?? err);
    return {
      mode: 'legacy_fallback',
      useLegacy: true,
      error: err?.message || 'governance_error'
    };
  }
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const enabled = isSstGovernanceEnabled();

  return {
    enabled,
    shadow_mode: !enabled,
    events_evaluated: _stats.events_evaluated || metrics[METRIC_EVENTS] || 0,
    matches: _stats.matches || metrics[METRIC_SHADOW_MATCH] || 0,
    divergences: _stats.divergences || metrics[METRIC_SHADOW_DIVERGENCE] || 0,
    migrated_events: _stats.migrated || metrics[METRIC_MIGRATED] || 0,
    shadow_total: metrics[METRIC_SHADOW_TOTAL] || 0,
    escalation_levels: Object.keys(SST_ESCALATION_LEVELS).map(Number)
  };
}

function resetStatsForTests() {
  _stats.events_evaluated = 0;
  _stats.matches = 0;
  _stats.divergences = 0;
  _stats.migrated = 0;
}

module.exports = {
  isSstGovernanceEnabled,
  buildGovernanceEvent,
  inferLegacyDistribution,
  compareShadow,
  dispatchSstNotification,
  runLegacyDistribution,
  getAuditStatus,
  resetStatsForTests,
  POLICY_ID,
  LEGACY_CHANNELS,
  METRIC_EVENTS,
  METRIC_MIGRATED,
  METRIC_SHADOW_TOTAL,
  METRIC_SHADOW_MATCH,
  METRIC_SHADOW_DIVERGENCE
};
