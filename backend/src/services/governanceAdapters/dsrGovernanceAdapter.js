'use strict';

/**
 * EVENT-GOVERNANCE-09 — adapter DSR/LGPD → Event Governance.
 * Orquestra distribuição apenas; workflow, SLA e tabela notifications permanecem inalterados.
 */

const db = require('../../db');
const observability = require('../observabilityService');
const eventGovernanceExecution = require('../eventGovernanceExecutionService');
const { normalizeSeverity } = require('../../governance/severityNormalizer');
const {
  DSR_NOTIFICATION_TYPES,
  buildNotificationContent
} = require('../dsrNotificationService');

const METRIC_EVENTS = 'event_governance_dsr_events';
const METRIC_MIGRATED = 'event_governance_dsr_migrated';
const METRIC_SHADOW_TOTAL = 'event_governance_dsr_shadow_total';
const METRIC_SHADOW_MATCH = 'event_governance_dsr_shadow_match';
const METRIC_SHADOW_DIVERGENCE = 'event_governance_dsr_shadow_divergence';

const POLICY_ID = 'DSR_LIFECYCLE';

/** @type {Record<string, object>} */
const LIFECYCLE_PHASE_CONFIG = Object.freeze({
  REQUEST_CREATED: Object.freeze({
    phase: 'REQUEST_CREATED',
    escalationLevel: 1,
    eventTypes: [
      DSR_NOTIFICATION_TYPES.EXPORT_SUBMITTED,
      DSR_NOTIFICATION_TYPES.ERASE_SUBMITTED
    ]
  }),
  REQUEST_ASSIGNED: Object.freeze({
    phase: 'REQUEST_ASSIGNED',
    escalationLevel: 2,
    eventTypes: [
      DSR_NOTIFICATION_TYPES.EXPORT_APPROVED,
      DSR_NOTIFICATION_TYPES.ERASE_APPROVED
    ]
  }),
  REQUEST_DUE_SOON: Object.freeze({
    phase: 'REQUEST_DUE_SOON',
    escalationLevel: 3,
    eventTypes: [DSR_NOTIFICATION_TYPES.SLA_APPROACHING]
  }),
  REQUEST_COMPLETED: Object.freeze({
    phase: 'REQUEST_COMPLETED',
    escalationLevel: 1,
    eventTypes: [
      DSR_NOTIFICATION_TYPES.EXPORT_EXECUTED,
      DSR_NOTIFICATION_TYPES.ERASE_EXECUTED
    ]
  }),
  REQUEST_REJECTED: Object.freeze({
    phase: 'REQUEST_REJECTED',
    escalationLevel: 2,
    eventTypes: [
      DSR_NOTIFICATION_TYPES.EXPORT_REJECTED,
      DSR_NOTIFICATION_TYPES.ERASE_REJECTED
    ]
  }),
  REQUEST_ESCALATED: Object.freeze({
    phase: 'REQUEST_ESCALATED',
    escalationLevel: 3,
    eventTypes: []
  })
});

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

function isDsrGovernanceEnabled() {
  return String(process.env.EVENT_GOVERNANCE_DSR || '').toLowerCase() === 'true';
}

function mapTypeToLifecyclePhase(type) {
  for (const cfg of Object.values(LIFECYCLE_PHASE_CONFIG)) {
    if (cfg.eventTypes.includes(type)) return cfg.phase;
  }
  if (String(type || '').includes('sla')) return 'REQUEST_DUE_SOON';
  if (String(type || '').includes('reject')) return 'REQUEST_REJECTED';
  if (String(type || '').includes('executed')) return 'REQUEST_COMPLETED';
  if (String(type || '').includes('approved')) return 'REQUEST_ASSIGNED';
  if (String(type || '').includes('submitted')) return 'REQUEST_CREATED';
  return 'REQUEST_ASSIGNED';
}

function getLifecycleConfig(phase) {
  return LIFECYCLE_PHASE_CONFIG[phase] || LIFECYCLE_PHASE_CONFIG.REQUEST_ASSIGNED;
}

function mapPriorityToSeverity(type) {
  const priority = buildNotificationContent({ type }).priority;
  if (priority === 'critical') return 'critical';
  if (priority === 'high') return 'high';
  return 'medium';
}

/**
 * @param {object} input
 * @returns {object}
 */
function buildGovernanceEvent(input) {
  const type = input.type;
  const lifecyclePhase = input.lifecyclePhase || mapTypeToLifecyclePhase(type);
  const cfg = getLifecycleConfig(lifecyclePhase);
  const severity = normalizeSeverity(input.severity || mapPriorityToSeverity(type));

  return {
    companyId: input.companyId,
    eventType: type || `dsr_${lifecyclePhase.toLowerCase()}`,
    category: 'dsr',
    severity,
    sourceModule: 'dsrNotificationService',
    payload: {
      lifecyclePhase,
      type,
      userId: input.userId,
      requestId: input.requestId || null,
      message: input.message || '',
      actionUrl: input.actionUrl || null,
      deadline: input.deadline || null,
      dsrRole: input.dsrRole || 'subject',
      subjectName: input.subjectName || null,
      recipientUserId: input.userId
    }
  };
}

/**
 * @param {object} input
 */
function inferLegacyDistribution(input) {
  const lifecyclePhase = input.lifecyclePhase || mapTypeToLifecyclePhase(input.type);
  const cfg = getLifecycleConfig(lifecyclePhase);
  const severity = normalizeSeverity(mapPriorityToSeverity(input.type));

  return {
    policyId: POLICY_ID,
    lifecyclePhase,
    severity,
    channels: ['notification_center', 'notifications_table'],
    escalationLevel: cfg.escalationLevel,
    recipientCount: input.userId ? 1 : 0,
    recipientUserId: input.userId || null
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
 * Persiste notificação DSR na tabela notifications (fonte NC-04 Federation).
 * @param {object} params
 * @returns {Promise<{ ok: boolean, reason?: string, error?: string }>}
 */
async function runLegacyDistribution(params) {
  const { userId, companyId, type, requestId, message, actionUrl, deadline } = params;

  if (!userId || !companyId || !type) {
    return { ok: false, reason: 'missing_params' };
  }

  const content = buildNotificationContent({
    type,
    requestId,
    message,
    actionUrl,
    deadline
  });

  try {
    await db.query(
      `
      INSERT INTO notifications (
        company_id, user_id, type, priority, title, message,
        related_entity_type, related_entity_id,
        action_required, action_url, action_deadline,
        read, dismissed, created_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, NOW(), $12)
    `,
      [
        companyId,
        userId,
        type,
        content.priority,
        content.title,
        content.finalMessage,
        'lgpd_data_request',
        requestId || null,
        content.actionRequired,
        content.actionUrl,
        content.actionDeadline,
        content.expiresAt
      ]
    );

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/**
 * Execução governance — persiste em notifications (compatível NC-04).
 * @param {object} input
 * @param {object} governanceResult
 */
async function _executeGovernanceDistribution(input, governanceResult) {
  const evaluation = governanceResult.evaluation || {};
  if (evaluation.approved !== true) {
    return { success: false, reason: 'not_approved' };
  }

  const steps = (governanceResult.execution?.executionPlan || []).filter(
    (step) => step.validationPassed
  );
  const ncSteps = steps.filter(
    (step) =>
      step.channel === 'notification_center' ||
      step.channel === 'notifications_table'
  );

  if (ncSteps.length === 0 && steps.length > 0) {
    return { success: false, reason: 'no_nc_steps' };
  }

  const result = await runLegacyDistribution(input);
  return {
    success: result.ok === true,
    channel: 'notifications_table',
    result
  };
}

/**
 * @param {object} input
 */
async function dispatchDsrNotification(input) {
  if (!input.companyId || !input.type) {
    return { skipped: true, reason: 'missing_params', useLegacy: true };
  }

  if (!input.userId) {
    return { skipped: true, reason: 'missing_userId', useLegacy: true };
  }

  _stats.events_evaluated += 1;
  _metric(METRIC_EVENTS);

  const migrated = isDsrGovernanceEnabled();
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
    console.warn('[dsrGovernanceAdapter][dispatch]', err?.message ?? err);
    return {
      mode: 'legacy_fallback',
      useLegacy: true,
      error: err?.message || 'governance_error'
    };
  }
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const enabled = isDsrGovernanceEnabled();

  return {
    enabled,
    shadow_mode: !enabled,
    events_evaluated: _stats.events_evaluated || metrics[METRIC_EVENTS] || 0,
    matches: _stats.matches || metrics[METRIC_SHADOW_MATCH] || 0,
    divergences: _stats.divergences || metrics[METRIC_SHADOW_DIVERGENCE] || 0,
    migrated_events: _stats.migrated || metrics[METRIC_MIGRATED] || 0,
    shadow_total: metrics[METRIC_SHADOW_TOTAL] || 0
  };
}

function resetStatsForTests() {
  _stats.events_evaluated = 0;
  _stats.matches = 0;
  _stats.divergences = 0;
  _stats.migrated = 0;
}

module.exports = {
  isDsrGovernanceEnabled,
  mapTypeToLifecyclePhase,
  getLifecycleConfig,
  buildGovernanceEvent,
  inferLegacyDistribution,
  compareShadow,
  dispatchDsrNotification,
  runLegacyDistribution,
  getAuditStatus,
  resetStatsForTests,
  LIFECYCLE_PHASE_CONFIG,
  POLICY_ID,
  METRIC_EVENTS,
  METRIC_MIGRATED,
  METRIC_SHADOW_TOTAL,
  METRIC_SHADOW_MATCH,
  METRIC_SHADOW_DIVERGENCE
};
