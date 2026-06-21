'use strict';

/**
 * EVENT-GOVERNANCE-05 — adapter IA Proactiva → Event Governance.
 * Substitui decisão local de distribuição (App Impetus + NC bridge).
 */

const observability = require('../observabilityService');
const notificationBridge = require('../notificationBridgeService');
const eventGovernanceExecution = require('../eventGovernanceExecutionService');
const { normalizeSeverity } = require('../../governance/severityNormalizer');

const METRIC_EVENTS = 'event_governance_ai_events';
const METRIC_MIGRATED = 'event_governance_ai_migrated';
const METRIC_SHADOW_TOTAL = 'event_governance_ai_shadow_total';
const METRIC_SHADOW_MATCH = 'event_governance_ai_shadow_match';
const METRIC_SHADOW_DIVERGENCE = 'event_governance_ai_shadow_divergence';

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

function isAiProactiveGovernanceEnabled() {
  return String(process.env.EVENT_GOVERNANCE_AI_PROACTIVE || '').toLowerCase() === 'true';
}

function _inferSeverity(input) {
  const t = String(input.triggerType || input.source || '').toLowerCase();
  if (t.includes('failure_pattern')) return 'high';
  if (t.includes('remind') || t.includes('incomplete')) return 'medium';
  return 'medium';
}

function _inferEventType(input) {
  const t = String(input.triggerType || input.source || '').toLowerCase();
  if (t.includes('failure_pattern')) return 'failure_pattern';
  if (t.includes('remind') || t.includes('incomplete')) return 'proactive_reminder';
  return 'ai_proactive';
}

function _inferSourceModule(input) {
  const src = String(input.source || '').toLowerCase();
  if (src.includes('proactiveai') || src.includes('proactive_ai')) return 'proactiveAI';
  return 'aiProactiveMessagingService';
}

/**
 * @param {object} input
 * @returns {object}
 */
function buildGovernanceEvent(input) {
  const message = String(input.message || '').trim();
  const severity = input.severity || _inferSeverity(input);

  return {
    companyId: input.companyId,
    eventType: input.eventType || _inferEventType(input),
    category: 'ai',
    severity,
    sourceModule: _inferSourceModule(input),
    payload: {
      message,
      phone: input.recipientPhone,
      recipientPhone: input.recipientPhone,
      userId: input.recipientUserId,
      recipientUserId: input.recipientUserId,
      triggerType: input.triggerType || 'generic',
      source: input.source || 'ai_proactive',
      originatedFrom: 'proactive',
      type: 'ai_proactive_governance'
    }
  };
}

/**
 * Distribuição legada: App Impetus + NC bridge (NC-03).
 * @param {object} input
 */
function inferLegacyDistribution(input) {
  const severity = normalizeSeverity(input.severity || _inferSeverity(input));
  const channels = ['app_impetus'];

  if (input.recipientUserId || input.recipientPhone) {
    channels.push('notification_center');
  }

  let escalationLevel = 1;
  if (severity === 'critical' || severity === 'high') escalationLevel = 2;

  return {
    severity,
    channels: [...new Set(channels)],
    escalationLevel,
    recipientUserId: input.recipientUserId || null,
    recipientPhone: input.recipientPhone || null,
    ncBridgeEligible: !!(input.recipientUserId || input.recipientPhone)
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
    severityMatch &&
    channelsMatch &&
    escalationMatch &&
    recipientsMatch;

  return {
    match,
    legacy: {
      severity: legacy.severity,
      channels: legacy.channels,
      escalationLevel: legacy.escalationLevel,
      recipientUserId: legacy.recipientUserId,
      recipientPhone: legacy.recipientPhone
    },
    governance: {
      policyId: govPolicy,
      severity: govSeverity,
      channels: govChannels,
      escalationLevel: govEscalation,
      approved: evaluation.approved,
      recipients: evaluation.recipients || decision.recipients || []
    },
    divergence: match
      ? null
      : {
          severity: !severityMatch,
          channels: !channelsMatch,
          escalation: !escalationMatch,
          recipients: !recipientsMatch,
          policy: !govPolicy || govPolicy === 'UNMATCHED'
        }
  };
}

async function _resolveNcUserId(companyId, recipientUserId, recipientPhone) {
  if (recipientUserId) return recipientUserId;
  if (recipientPhone) {
    return notificationBridge.resolveUserIdByPhone(companyId, recipientPhone);
  }
  return null;
}

async function _executeGovernanceDistribution(companyId, input, governanceResult) {
  const steps = (governanceResult.execution?.executionPlan || []).filter(
    (step) => step.validationPassed
  );
  if (!steps.length) {
    return { executed: 0, results: [], success: false };
  }

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
          phone: input.recipientPhone,
          originatedFrom: 'proactive',
          type: 'ai_proactive_governance'
        }
      });
      results.push(r);
    } else if (step.channel === 'notification_center') {
      const userId = await _resolveNcUserId(
        companyId,
        input.recipientUserId,
        input.recipientPhone
      );
      if (!userId) {
        results.push({ ok: false, channel: 'notification_center', skipped: true, reason: 'no_user_id' });
        continue;
      }
      const ncMessage = `[IA Proativa] ${message}`.slice(0, 4000);
      const r = await eventGovernanceExecution.executePlan({
        executable: true,
        executionPlan: [step],
        decisionRef: governanceResult.execution.decisionRef,
        companyId,
        payload: {
          message: ncMessage,
          userId,
          type: 'ai_proactive_governance'
        }
      });
      results.push(r);
    }
  }

  const success = results.some((r) => r.success === true || r.ok === true);
  return { executed: results.length, results, success };
}

/**
 * Fluxo legado completo (App Impetus + NC bridge).
 * @param {object} input
 * @param {object} [opts]
 */
async function runLegacyDistribution(input, opts = {}) {
  const appImpetusService = require('../appImpetusService');
  const { companyId, recipientPhone, recipientUserId, message } = input;

  const result = await appImpetusService.sendMessage(companyId, recipientPhone, message, {
    originatedFrom: 'proactive'
  });

  if (opts.logCommunication !== false) {
    await appImpetusService.logOutboundCommunication(companyId, recipientPhone, message, {});
  }

  await notificationBridge.bridgeProactiveMessage(
    companyId,
    recipientUserId,
    recipientPhone,
    message
  );

  return { ok: result.ok === true, appResult: result, mode: 'legacy' };
}

/**
 * Ponto de entrada — shadow, migrado ou fallback.
 * @param {object} input — { companyId, recipientUserId, recipientPhone, message, source, triggerType }
 */
async function dispatchAiProactive(input) {
  if (!input?.companyId || !input?.recipientPhone || !input?.message) {
    return { skipped: true, reason: 'missing_params', useLegacy: true };
  }

  _stats.events_evaluated += 1;
  _metric(METRIC_EVENTS);

  const migrated = isAiProactiveGovernanceEnabled();
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
      useLegacy: false,
      governanceResult,
      distribution
    };
  } catch (err) {
    console.warn('[aiProactiveGovernanceAdapter][dispatch]', err?.message ?? err);
    return {
      mode: 'legacy_fallback',
      useLegacy: true,
      error: err?.message || 'governance_error'
    };
  }
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const enabled = isAiProactiveGovernanceEnabled();

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
  isAiProactiveGovernanceEnabled,
  buildGovernanceEvent,
  inferLegacyDistribution,
  compareShadow,
  dispatchAiProactive,
  runLegacyDistribution,
  getAuditStatus,
  resetStatsForTests,
  METRIC_EVENTS,
  METRIC_MIGRATED,
  METRIC_SHADOW_TOTAL,
  METRIC_SHADOW_MATCH,
  METRIC_SHADOW_DIVERGENCE
};
