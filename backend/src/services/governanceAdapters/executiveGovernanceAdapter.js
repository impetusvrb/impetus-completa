'use strict';

/**
 * EVENT-GOVERNANCE-07 — adapter Executive Mode → Event Governance.
 * Substitui decisão local de distribuição (App Impetus + NC bridge executivo).
 */

const observability = require('../observabilityService');
const notificationBridge = require('../notificationBridgeService');
const eventGovernanceExecution = require('../eventGovernanceExecutionService');
const { normalizeSeverity } = require('../../governance/severityNormalizer');

const METRIC_EVENTS = 'event_governance_executive_events';
const METRIC_MIGRATED = 'event_governance_executive_migrated';
const METRIC_SHADOW_TOTAL = 'event_governance_executive_shadow_total';
const METRIC_SHADOW_MATCH = 'event_governance_executive_shadow_match';
const METRIC_SHADOW_DIVERGENCE = 'event_governance_executive_shadow_divergence';

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

function isExecutiveGovernanceEnabled() {
  return String(process.env.EVENT_GOVERNANCE_EXECUTIVE || '').toLowerCase() === 'true';
}

function _normalizeExecutivePhone(phone) {
  const normalized = String(phone || '').replace(/\D/g, '');
  if (normalized.length < 10) return '';
  return normalized.startsWith('55') ? normalized : `55${normalized.slice(-11)}`;
}

/**
 * @param {object} input
 * @returns {object}
 */
function buildGovernanceEvent(input) {
  const message = String(input.message || '').trim();
  const phone = _normalizeExecutivePhone(input.recipientPhone || input.phone);

  return {
    companyId: input.companyId,
    eventType: input.eventType || 'executive_response',
    category: 'executive',
    severity: normalizeSeverity(input.severity || 'high'),
    sourceModule: 'executiveMode',
    payload: {
      message,
      phone,
      recipientPhone: phone,
      userId: input.recipientUserId || null,
      recipientUserId: input.recipientUserId || null,
      role: input.role || null,
      jobTitle: input.jobTitle || null,
      metadata: input.metadata || {},
      originatedFrom: 'executive',
      type: 'executive_governance'
    }
  };
}

/**
 * Distribuição legada: App Impetus + NC bridge (se elegível).
 * @param {object} input
 */
function inferLegacyDistribution(input) {
  const phone = _normalizeExecutivePhone(input.recipientPhone || input.phone);
  const severity = normalizeSeverity(input.severity || 'high');
  const channels = ['app_impetus'];

  if (phone) {
    channels.push('notification_center');
  }

  return {
    severity,
    channels: [...new Set(channels)],
    escalationLevel: 2,
    recipientUserId: input.recipientUserId || null,
    recipientPhone: phone || null,
    ncBridgeEligible: !!phone
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
  const hasLegacyTarget = !!(legacy.recipientUserId || legacy.recipientPhone);
  const govRecipients =
    governanceResult.evaluation?.recipients ||
    governanceResult.evaluation?.decision?.recipients ||
    [];
  return hasLegacyTarget === (govRecipients.length > 0 || legacy.ncBridgeEligible);
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

  const match =
    evaluation.approved === true &&
    govPolicy === 'EXECUTIVE_ALERT' &&
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
          policy: govPolicy !== 'EXECUTIVE_ALERT'
        }
  };
}

async function _executeGovernanceDistribution(companyId, input, governanceResult) {
  const steps = (governanceResult.execution?.executionPlan || []).filter(
    (step) => step.validationPassed
  );
  const phone = _normalizeExecutivePhone(input.recipientPhone || input.phone);
  const message = String(input.message || '').slice(0, 4000);
  const results = [];

  for (const step of steps) {
    if (step.channel === 'app_impetus') {
      const r = await eventGovernanceExecution.executePlan({
        executable: true,
        executionPlan: [step],
        decisionRef: governanceResult.execution.decisionRef,
        companyId,
        payload: {
          message,
          phone,
          originatedFrom: 'executive',
          type: 'executive_governance'
        }
      });
      results.push(r);
    } else if (step.channel === 'notification_center') {
      let uid = input.recipientUserId || null;
      if (!uid && phone) {
        uid = await notificationBridge.resolveUserIdByPhone(companyId, phone);
      }
      if (!uid) {
        results.push({ ok: false, channel: 'notification_center', skipped: true, reason: 'no_user_id' });
        continue;
      }
      const eligible = await notificationBridge.loadUserExecutiveEligibility(companyId, uid);
      if (!eligible) {
        results.push({ ok: false, channel: 'notification_center', skipped: true, reason: 'role' });
        continue;
      }
      const ncMessage = `[Modo Executivo] ${message}`.slice(0, 3900);
      const r = await eventGovernanceExecution.executePlan({
        executable: true,
        executionPlan: [step],
        decisionRef: governanceResult.execution.decisionRef,
        companyId,
        payload: {
          message: ncMessage,
          userId: uid,
          type: 'executive_governance'
        }
      });
      results.push(r);
    }
  }

  const success = results.some((r) => r.success === true || r.ok === true);
  return { executed: results.length, results, success };
}

/**
 * Fluxo legado executivo completo.
 * @param {object} input
 */
async function runLegacyDistribution(input) {
  const appImpetusService = require('../appImpetusService');
  const { companyId, message } = input;
  const phone = _normalizeExecutivePhone(input.recipientPhone || input.phone);

  if (phone.length < 12) {
    return { ok: false, reason: 'invalid_phone' };
  }

  const result = await appImpetusService.sendMessage(companyId, phone, message, {
    originatedFrom: 'executive'
  });

  await notificationBridge.bridgeExecutiveMessage(
    companyId,
    input.recipientUserId || null,
    phone,
    message
  );

  return { ok: result.ok === true, appResult: result, mode: 'legacy' };
}

/**
 * @param {object} input
 */
async function dispatchExecutiveMessage(input) {
  if (!input?.companyId || !input?.message) {
    return { skipped: true, reason: 'missing_params', useLegacy: true };
  }

  const phone = _normalizeExecutivePhone(input.recipientPhone || input.phone);
  if (phone.length < 12) {
    return { skipped: true, reason: 'invalid_phone', useLegacy: true };
  }

  _stats.events_evaluated += 1;
  _metric(METRIC_EVENTS);

  const migrated = isExecutiveGovernanceEnabled();
  const event = buildGovernanceEvent({ ...input, recipientPhone: phone });
  const legacy = inferLegacyDistribution({ ...input, recipientPhone: phone });

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

    const distribution = await _executeGovernanceDistribution(
      input.companyId,
      { ...input, recipientPhone: phone },
      governanceResult
    );

    return {
      mode: 'governance',
      useLegacy: !distribution.success,
      governanceResult,
      distribution
    };
  } catch (err) {
    console.warn('[executiveGovernanceAdapter][dispatch]', err?.message ?? err);
    return {
      mode: 'legacy_fallback',
      useLegacy: true,
      error: err?.message || 'governance_error'
    };
  }
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const enabled = isExecutiveGovernanceEnabled();

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
  isExecutiveGovernanceEnabled,
  buildGovernanceEvent,
  inferLegacyDistribution,
  compareShadow,
  dispatchExecutiveMessage,
  runLegacyDistribution,
  getAuditStatus,
  resetStatsForTests,
  METRIC_EVENTS,
  METRIC_MIGRATED,
  METRIC_SHADOW_TOTAL,
  METRIC_SHADOW_MATCH,
  METRIC_SHADOW_DIVERGENCE
};
