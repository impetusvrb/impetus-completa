'use strict';

/**
 * EVENT-GOVERNANCE-10 — adapter ManuIA → Event Governance.
 * Orquestra distribuição apenas; diagnósticos, IA, OCR e motor de manutenção inalterados.
 */

const observability = require('../observabilityService');
const eventGovernanceExecution = require('../eventGovernanceExecutionService');
const { normalizeSeverity } = require('../../governance/severityNormalizer');

const METRIC_EVENTS = 'event_governance_manuia_events';
const METRIC_MIGRATED = 'event_governance_manuia_migrated';
const METRIC_SHADOW_TOTAL = 'event_governance_manuia_shadow_total';
const METRIC_SHADOW_MATCH = 'event_governance_manuia_shadow_match';
const METRIC_SHADOW_DIVERGENCE = 'event_governance_manuia_shadow_divergence';

const POLICY_ID = 'MANUIA_INBOX';

/** @type {Record<string, object>} */
const TECHNICAL_PHASE_CONFIG = Object.freeze({
  DIAGNOSTIC_CREATED: Object.freeze({
    phase: 'DIAGNOSTIC_CREATED',
    escalationLevel: 1,
    patterns: [/diagnostic.*creat/i, /diagnostic_start/i, /diagnostic_created/i]
  }),
  DIAGNOSTIC_COMPLETED: Object.freeze({
    phase: 'DIAGNOSTIC_COMPLETED',
    escalationLevel: 1,
    patterns: [/diagnostic.*complet/i, /diagnostic_completed/i]
  }),
  MANUAL_ANALYZED: Object.freeze({
    phase: 'MANUAL_ANALYZED',
    escalationLevel: 1,
    patterns: [/manual_analy/i, /manual_ocr/i, /manual_analyzed/i]
  }),
  FAILURE_PREDICTED: Object.freeze({
    phase: 'FAILURE_PREDICTED',
    escalationLevel: 2,
    patterns: [/failure_predict/i, /predictive_failure/i, /predict/i]
  }),
  MAINTENANCE_RECOMMENDED: Object.freeze({
    phase: 'MAINTENANCE_RECOMMENDED',
    escalationLevel: 2,
    patterns: [/maintenance_recommend/i, /maintenance_suggest/i, /recommend/i]
  }),
  CRITICAL_FAILURE: Object.freeze({
    phase: 'CRITICAL_FAILURE',
    escalationLevel: 3,
    patterns: [/plc_critical/i, /critical_failure/i, /machine_stopped/i, /emergency/i]
  }),
  ANOMALY_DETECTED: Object.freeze({
    phase: 'ANOMALY_DETECTED',
    escalationLevel: 2,
    patterns: [/anomaly/i, /ops_anomaly/i, /operational_anomaly/i]
  }),
  WORK_ORDER_CREATED: Object.freeze({
    phase: 'WORK_ORDER_CREATED',
    escalationLevel: 1,
    patterns: [/work_order_created/i]
  }),
  MANUAL_ESCALATION: Object.freeze({
    phase: 'MANUAL_ESCALATION',
    escalationLevel: 3,
    patterns: [/manual_escalation/i, /escalat/i]
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

function isManuiaGovernanceEnabled() {
  return String(process.env.EVENT_GOVERNANCE_MANUIA || '').toLowerCase() === 'true';
}

function mapEventTypeToTechnicalPhase(eventType) {
  const et = String(eventType || 'generic').toLowerCase();
  for (const cfg of Object.values(TECHNICAL_PHASE_CONFIG)) {
    if (cfg.patterns.some((p) => p.test(et))) {
      return cfg.phase;
    }
  }
  return 'GENERIC';
}

function getTechnicalPhaseConfig(phase) {
  return TECHNICAL_PHASE_CONFIG[phase] || { phase: 'GENERIC', escalationLevel: 1, patterns: [] };
}

function _mapSeverityToEscalation(severity, phase) {
  const sev = normalizeSeverity(severity || 'medium');
  if (sev === 'critical') return 3;
  if (sev === 'high') return 2;
  return getTechnicalPhaseConfig(phase).escalationLevel || 1;
}

/**
 * @param {object} input
 * @returns {object}
 */
function buildGovernanceEvent(input) {
  const eventType = input.eventType || 'manuia_generic';
  const technicalPhase = input.technicalPhase || mapEventTypeToTechnicalPhase(eventType);
  const severity = normalizeSeverity(input.severity || 'medium');

  return {
    companyId: input.companyId,
    eventType,
    category: 'manuia',
    severity,
    sourceModule: 'manuiaInboxIngestService',
    payload: {
      technicalPhase,
      eventType,
      userId: input.userId,
      title: input.title,
      body: input.body || null,
      source: input.source || 'system',
      machineId: input.machineId || null,
      workOrderId: input.workOrderId || null,
      requiresAck: !!input.requiresAck,
      payload: input.payload || {}
    }
  };
}

/**
 * @param {object} input
 */
function inferLegacyDistribution(input) {
  const eventType = input.eventType || 'generic';
  const technicalPhase = mapEventTypeToTechnicalPhase(eventType);
  const severity = normalizeSeverity(input.severity || 'medium');
  const channels = ['manuia_inbox', 'web_push_optional'];

  return {
    policyId: POLICY_ID,
    technicalPhase,
    severity,
    channels,
    escalationLevel: _mapSeverityToEscalation(severity, technicalPhase),
    recipientUserId: input.userId || null,
    recipientCount: input.userId ? 1 : 0
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
 * Fluxo legado completo (inbox + push opcional).
 * @param {object} input
 */
async function runLegacyDistribution(input) {
  const ingest = require('../manuiaApp/manuiaInboxIngestService');
  const result = await ingest.executeLegacyIngest(input);
  return { ok: !!result?.row, result };
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

  const steps = (governanceResult.execution?.executionPlan || []).filter(
    (step) => step.validationPassed
  );
  const inboxSteps = steps.filter(
    (step) =>
      step.channel === 'manuia_inbox' ||
      step.channel === 'web_push_optional' ||
      step.channel === 'app_impetus'
  );

  if (inboxSteps.length === 0 && steps.length > 0) {
    return { success: false, reason: 'no_manuia_steps' };
  }

  const result = await runLegacyDistribution(input);
  return {
    success: result.ok === true,
    channel: 'manuia_inbox',
    result: result.result
  };
}

/**
 * @param {object} input
 */
async function dispatchManuiaNotification(input) {
  if (!input.companyId || !input.title) {
    return { skipped: true, reason: 'missing_params', useLegacy: true };
  }

  if (!input.userId) {
    return { skipped: true, reason: 'missing_userId', useLegacy: true };
  }

  _stats.events_evaluated += 1;
  _metric(METRIC_EVENTS);

  const migrated = isManuiaGovernanceEnabled();
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
    console.warn('[manuiaGovernanceAdapter][dispatch]', err?.message ?? err);
    return {
      mode: 'legacy_fallback',
      useLegacy: true,
      error: err?.message || 'governance_error'
    };
  }
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const enabled = isManuiaGovernanceEnabled();

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
  isManuiaGovernanceEnabled,
  mapEventTypeToTechnicalPhase,
  getTechnicalPhaseConfig,
  buildGovernanceEvent,
  inferLegacyDistribution,
  compareShadow,
  dispatchManuiaNotification,
  runLegacyDistribution,
  getAuditStatus,
  resetStatsForTests,
  TECHNICAL_PHASE_CONFIG,
  POLICY_ID,
  METRIC_EVENTS,
  METRIC_MIGRATED,
  METRIC_SHADOW_TOTAL,
  METRIC_SHADOW_MATCH,
  METRIC_SHADOW_DIVERGENCE
};
