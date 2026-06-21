'use strict';

/**
 * EVENT-GOVERNANCE-06 — adapter TPM → Event Governance.
 * Substitui decisão local de distribuição (App Impetus + NC bridge + alerts opcional).
 */

const observability = require('../observabilityService');
const notificationBridge = require('../notificationBridgeService');
const eventGovernanceExecution = require('../eventGovernanceExecutionService');
const { normalizeSeverity } = require('../../governance/severityNormalizer');

const METRIC_EVENTS = 'event_governance_tpm_events';
const METRIC_MIGRATED = 'event_governance_tpm_migrated';
const METRIC_SHADOW_TOTAL = 'event_governance_tpm_shadow_total';
const METRIC_SHADOW_MATCH = 'event_governance_tpm_shadow_match';
const METRIC_SHADOW_DIVERGENCE = 'event_governance_tpm_shadow_divergence';

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

function isTpmGovernanceEnabled() {
  return String(process.env.EVENT_GOVERNANCE_TPM || '').toLowerCase() === 'true';
}

function _totalLosses(incident) {
  if (!incident || typeof incident !== 'object') return 0;
  return (
    (Number(incident.losses_before) || 0) +
    (Number(incident.losses_during) || 0) +
    (Number(incident.losses_after) || 0)
  );
}

/**
 * @param {object} incident
 * @param {object} [input]
 * @returns {string}
 */
function inferSeverityFromIncident(incident, input = {}) {
  if (input.severity) return normalizeSeverity(input.severity);
  const sev = String(incident?.severity || incident?.priority || input.priority || '').toLowerCase();
  if (['critical', 'critica', 'high', 'alta'].includes(sev)) return 'high';
  if (notificationBridge.isTpmIncidentCritical(incident)) return 'high';
  return 'medium';
}

function _shouldPersistAlertRow() {
  const v = String(process.env.TPM_NOTIFICATIONS_PERSIST_ALERT || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * @param {object} input
 * @returns {object}
 */
function buildGovernanceEvent(input) {
  const incident = input.incident || {};
  const message = String(input.message || '').trim();
  const severity = inferSeverityFromIncident(incident, input);
  const losses = input.losses != null ? input.losses : _totalLosses(incident);

  return {
    companyId: input.companyId,
    eventType: 'tpm_incident',
    category: 'tpm',
    severity,
    sourceModule: 'tpmNotifications',
    payload: {
      message,
      incidentId: input.incidentId || incident.id || null,
      severity,
      priority: input.priority || incident.priority || null,
      losses,
      equipmentCode: incident.equipment_code || incident.component_name || null,
      originatedFrom: 'tpm',
      type: 'tpm_governance'
    }
  };
}

/**
 * Distribuição legada inferida (App + NC bridge crítico + alerts opcional).
 * @param {object} input
 */
function inferLegacyDistribution(input) {
  const incident = input.incident || {};
  const severity = inferSeverityFromIncident(incident, input);
  const critical = notificationBridge.isTpmIncidentCritical(incident);
  const channels = ['app_impetus'];

  if (critical) {
    channels.push('notification_center');
  }

  if (_shouldPersistAlertRow()) {
    channels.push('dashboard');
  }

  const recipientCount = Array.isArray(input.recipients) ? input.recipients.length : 0;

  return {
    severity,
    channels: [...new Set(channels)],
    escalationLevel: critical ? 2 : 1,
    critical,
    recipientCount,
    losses: input.losses != null ? input.losses : _totalLosses(incident)
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

function _recipientsMatch(legacy, governanceResult) {
  const govRecipients =
    governanceResult.evaluation?.recipients ||
    governanceResult.evaluation?.decision?.recipients ||
    [];
  return legacy.recipientCount > 0 || govRecipients.length > 0;
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

  const govSeverity = decision.severity || legacy.severity;
  const govPolicy = evaluation.policyId || decision.policyId || null;
  const govEscalation = decision.escalationLevel ?? evaluation.escalationLevel ?? 0;

  const severityMatch = legacy.severity === govSeverity;
  const channelsMatch = _channelsEqual(legacy.channels, govChannels);
  const escalationMatch = legacy.escalationLevel === govEscalation;
  const recipientsMatch = _recipientsMatch(legacy, governanceResult);

  const policyOk =
    legacy.critical === false
      ? evaluation.approved === true || govPolicy === 'UNMATCHED'
      : evaluation.approved === true && govPolicy === 'TPM_CRITICAL';

  const match =
    policyOk &&
    severityMatch &&
    channelsMatch &&
    escalationMatch &&
    recipientsMatch;

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
          severity: !severityMatch,
          channels: !channelsMatch,
          escalation: !escalationMatch,
          recipients: !recipientsMatch,
          policy: !policyOk
        }
  };
}

async function _executeGovernanceDistribution(companyId, input, governanceResult) {
  const steps = (governanceResult.execution?.executionPlan || []).filter(
    (step) => step.validationPassed
  );
  const recipients = Array.isArray(input.recipients) ? input.recipients : [];
  const message = String(input.message || '').slice(0, 4000);
  const results = [];

  for (const step of steps) {
    if (step.channel === 'app_impetus') {
      for (const rec of recipients) {
        const phone = String(rec.phone || rec.whatsapp_number || '').replace(/\D/g, '');
        if (phone.length < 10) continue;
        const r = await eventGovernanceExecution.executePlan({
          executable: true,
          executionPlan: [step],
          decisionRef: governanceResult.execution.decisionRef,
          companyId,
          payload: {
            message,
            phone,
            originatedFrom: 'tpm',
            type: 'tpm_governance'
          }
        });
        results.push(r);
      }
    } else if (step.channel === 'notification_center') {
      const seen = new Set();
      for (const rec of recipients) {
        const uid = rec?.id;
        if (!uid || seen.has(String(uid))) continue;
        seen.add(String(uid));
        const r = await eventGovernanceExecution.executePlan({
          executable: true,
          executionPlan: [step],
          decisionRef: governanceResult.execution.decisionRef,
          companyId,
          payload: {
            message: `[TPM] ${message}`.slice(0, 4000),
            userId: uid,
            type: 'tpm_governance'
          }
        });
        results.push(r);
      }
      if (results.filter((r) => r.channelsExecuted?.includes('notification_center')).length === 0) {
        const fallbackIds = await notificationBridge.findSupervisorNcRecipients(companyId, 3);
        for (const uid of fallbackIds) {
          const r = await eventGovernanceExecution.executePlan({
            executable: true,
            executionPlan: [step],
            decisionRef: governanceResult.execution.decisionRef,
            companyId,
            payload: {
              message: `[TPM] ${message}`.slice(0, 4000),
              userId: uid,
              type: 'tpm_governance'
            }
          });
          results.push(r);
        }
      }
    }
  }

  const success = results.some((r) => r.success === true);
  return { executed: results.length, results, success };
}

/**
 * Fluxo legado TPM completo.
 * @param {object} input
 */
async function runLegacyDistribution(input) {
  const { companyId, incident, message, recipients } = input;
  const appImpetusService = require('../appImpetusService');

  let sent = 0;
  for (const rec of recipients || []) {
    const phone = String(rec.phone || rec.whatsapp_number || '').replace(/\D/g, '');
    if (phone.length >= 10) {
      try {
        await appImpetusService.sendMessage(companyId, phone, message, { originatedFrom: 'tpm' });
        sent += 1;
      } catch (err) {
        console.warn('[tpmGovernanceAdapter][legacy_app]', err?.message ?? err);
      }
    }
  }

  await notificationBridge.bridgeTpmIncident(companyId, incident, message, recipients || []);

  return { ok: sent > 0, sent, mode: 'legacy' };
}

/**
 * @param {object} input
 */
async function dispatchTpmIncident(input) {
  if (!input?.companyId || !input?.message) {
    return { skipped: true, reason: 'missing_params', useLegacy: true };
  }

  _stats.events_evaluated += 1;
  _metric(METRIC_EVENTS);

  const migrated = isTpmGovernanceEnabled();
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

    const distribution = await _executeGovernanceDistribution(input.companyId, input, governanceResult);

    return {
      mode: 'governance',
      useLegacy: !distribution.success,
      governanceResult,
      distribution
    };
  } catch (err) {
    console.warn('[tpmGovernanceAdapter][dispatch]', err?.message ?? err);
    return {
      mode: 'legacy_fallback',
      useLegacy: true,
      error: err?.message || 'governance_error'
    };
  }
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const enabled = isTpmGovernanceEnabled();

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
  isTpmGovernanceEnabled,
  buildGovernanceEvent,
  inferLegacyDistribution,
  inferSeverityFromIncident,
  compareShadow,
  dispatchTpmIncident,
  runLegacyDistribution,
  getAuditStatus,
  resetStatsForTests,
  METRIC_EVENTS,
  METRIC_MIGRATED,
  METRIC_SHADOW_TOTAL,
  METRIC_SHADOW_MATCH,
  METRIC_SHADOW_DIVERGENCE
};
