'use strict';

/**
 * EVENT-GOVERNANCE-11A — adapter Quality → Event Governance.
 * Orquestra distribuição apenas; workflow, CAPA, NC e indicadores permanecem inalterados.
 */

const observability = require('../observabilityService');
const eventGovernanceExecution = require('../eventGovernanceExecutionService');
const { normalizeSeverity } = require('../../governance/severityNormalizer');

const METRIC_EVENTS = 'event_governance_quality_events';
const METRIC_MIGRATED = 'event_governance_quality_migrated';
const METRIC_SHADOW_TOTAL = 'event_governance_quality_shadow_total';
const METRIC_SHADOW_MATCH = 'event_governance_quality_shadow_match';
const METRIC_SHADOW_DIVERGENCE = 'event_governance_quality_shadow_divergence';

const POLICY_ID = 'QUALITY_LIFECYCLE';

const LEGACY_CHANNELS = Object.freeze([
  'notification_center',
  'dashboard',
  'chat',
  'app_impetus'
]);

/** @type {Record<string, object>} */
const LIFECYCLE_PHASE_CONFIG = Object.freeze({
  QUALITY_NON_CONFORMITY_CREATED: Object.freeze({
    phase: 'QUALITY_NON_CONFORMITY_CREATED',
    escalationLevel: 2,
    patterns: [/non_conformity_created/, /nc_created/, /defect_increase/]
  }),
  QUALITY_NON_CONFORMITY_CRITICAL: Object.freeze({
    phase: 'QUALITY_NON_CONFORMITY_CRITICAL',
    escalationLevel: 3,
    patterns: [/critical/, /non_conformity_critical/, /severe/]
  }),
  QUALITY_AUDIT_DUE: Object.freeze({
    phase: 'QUALITY_AUDIT_DUE',
    escalationLevel: 2,
    patterns: [/audit_due/, /audit_scheduled/]
  }),
  QUALITY_AUDIT_OVERDUE: Object.freeze({
    phase: 'QUALITY_AUDIT_OVERDUE',
    escalationLevel: 3,
    patterns: [/audit_overdue/]
  }),
  QUALITY_CAPA_CREATED: Object.freeze({
    phase: 'QUALITY_CAPA_CREATED',
    escalationLevel: 2,
    patterns: [/capa_created/, /capa\.created/]
  }),
  QUALITY_CAPA_OVERDUE: Object.freeze({
    phase: 'QUALITY_CAPA_OVERDUE',
    escalationLevel: 3,
    patterns: [/capa_overdue/, /capa\.extended/]
  }),
  QUALITY_INSPECTION_FAILED: Object.freeze({
    phase: 'QUALITY_INSPECTION_FAILED',
    escalationLevel: 2,
    patterns: [/inspection_failed/, /low_conformity/, /non_conforming/]
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

function isQualityGovernanceEnabled() {
  return String(process.env.EVENT_GOVERNANCE_QUALITY || '').toLowerCase() === 'true';
}

function mapEventTypeToLifecyclePhase(eventType, severity) {
  const et = String(eventType || '').toLowerCase();
  for (const cfg of Object.values(LIFECYCLE_PHASE_CONFIG)) {
    if (cfg.patterns.some((p) => p.test(et))) {
      return cfg.phase;
    }
  }
  const sev = normalizeSeverity(severity || 'medium');
  if (sev === 'critical') return 'QUALITY_NON_CONFORMITY_CRITICAL';
  if (et.includes('capa')) return 'QUALITY_CAPA_CREATED';
  if (et.includes('audit')) return 'QUALITY_AUDIT_DUE';
  if (et.includes('inspection') || et.includes('conformity')) {
    return 'QUALITY_INSPECTION_FAILED';
  }
  return 'QUALITY_NON_CONFORMITY_CREATED';
}

function getLifecycleConfig(phase) {
  return (
    LIFECYCLE_PHASE_CONFIG[phase] || LIFECYCLE_PHASE_CONFIG.QUALITY_NON_CONFORMITY_CREATED
  );
}

function _mapSeverityToEscalation(severity, phase) {
  const sev = normalizeSeverity(severity || 'medium');
  if (sev === 'critical') return 3;
  if (sev === 'high') return 2;
  return getLifecycleConfig(phase).escalationLevel || 2;
}

/**
 * @param {object} input
 * @returns {object}
 */
function buildGovernanceEvent(input) {
  const eventType = input.eventType || `quality_${input.alertType || 'generic'}`;
  const lifecyclePhase =
    input.lifecyclePhase || mapEventTypeToLifecyclePhase(eventType, input.severity);
  const severity = normalizeSeverity(input.severity || 'medium');

  return {
    companyId: input.companyId,
    eventType,
    category: 'quality',
    severity,
    sourceModule: 'qualityIntelligenceService',
    payload: {
      lifecyclePhase,
      eventType,
      alertType: input.alertType || null,
      alertId: input.alertRow?.id || input.alertId || null,
      title: input.title || input.alertRow?.title || '',
      targetRoleLevel: input.targetRoleLevel ?? input.alertRow?.target_role_level ?? 5,
      entityType: input.alertRow?.entity_type || null,
      entityId: input.alertRow?.entity_id || null,
      lotNumber: input.alertRow?.lot_number || null
    }
  };
}

/**
 * @param {object} input
 */
function inferLegacyDistribution(input) {
  const eventType = input.eventType || `quality_${input.alertType || 'generic'}`;
  const lifecyclePhase = mapEventTypeToLifecyclePhase(eventType, input.severity);
  const severity = normalizeSeverity(input.severity || 'medium');

  return {
    policyId: POLICY_ID,
    lifecyclePhase,
    severity,
    channels: [...LEGACY_CHANNELS],
    escalationLevel: _mapSeverityToEscalation(severity, lifecyclePhase),
    targetRoleLevel: input.targetRoleLevel ?? input.alertRow?.target_role_level ?? 5
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
 * Fluxo legado — despacho ManuIA quality (inalterado).
 * @param {object} input
 */
async function runLegacyDistribution(input) {
  const companyId = input.companyId;
  const alertRow = input.alertRow;
  if (!companyId || !alertRow) {
    return { ok: false, reason: 'missing_alert_row' };
  }

  const eventDispatch = require('../manuiaApp/manuiaEventDispatchService');
  eventDispatch.scheduleDispatch('[MANUIA_DISPATCH_QUALITY]', () =>
    eventDispatch.dispatchFromQualityAlert(companyId, alertRow)
  );
  return { ok: true, scheduled: true };
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
async function dispatchQualityNotification(input) {
  if (!input.companyId) {
    return { skipped: true, reason: 'missing_companyId', useLegacy: true };
  }

  if (!input.alertRow && !input.alertType) {
    return { skipped: true, reason: 'missing_alert', useLegacy: true };
  }

  _stats.events_evaluated += 1;
  _metric(METRIC_EVENTS);

  const migrated = isQualityGovernanceEnabled();
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
    console.warn('[qualityGovernanceAdapter][dispatch]', err?.message ?? err);
    return {
      mode: 'legacy_fallback',
      useLegacy: true,
      error: err?.message || 'governance_error'
    };
  }
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const enabled = isQualityGovernanceEnabled();

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
  isQualityGovernanceEnabled,
  mapEventTypeToLifecyclePhase,
  getLifecycleConfig,
  buildGovernanceEvent,
  inferLegacyDistribution,
  compareShadow,
  dispatchQualityNotification,
  runLegacyDistribution,
  getAuditStatus,
  resetStatsForTests,
  LIFECYCLE_PHASE_CONFIG,
  POLICY_ID,
  LEGACY_CHANNELS,
  METRIC_EVENTS,
  METRIC_MIGRATED,
  METRIC_SHADOW_TOTAL,
  METRIC_SHADOW_MATCH,
  METRIC_SHADOW_DIVERGENCE
};
