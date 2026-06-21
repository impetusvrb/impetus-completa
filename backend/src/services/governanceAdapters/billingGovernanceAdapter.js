'use strict';

/**
 * EVENT-GOVERNANCE-08 — adapter Billing → Event Governance.
 * Orquestra distribuição apenas; dedupe e lógica financeira permanecem no billing service.
 */

const observability = require('../observabilityService');
const eventGovernanceExecution = require('../eventGovernanceExecutionService');
const { normalizeSeverity } = require('../../governance/severityNormalizer');

const METRIC_EVENTS = 'event_governance_billing_events';
const METRIC_MIGRATED = 'event_governance_billing_migrated';
const METRIC_SHADOW_TOTAL = 'event_governance_billing_shadow_total';
const METRIC_SHADOW_MATCH = 'event_governance_billing_shadow_match';
const METRIC_SHADOW_DIVERGENCE = 'event_governance_billing_shadow_divergence';

/** @type {Record<number, object>} */
const BILLING_DAY_CONFIG = Object.freeze({
  3: Object.freeze({
    phase: 'DAY_3_EMAIL',
    policyId: 'BILLING_EMAIL_DAY3',
    eventType: 'subscription_notification_day3',
    channel: 'email',
    severity: 'medium',
    escalationLevel: 1
  }),
  5: Object.freeze({
    phase: 'DAY_5_APP',
    policyId: 'BILLING_APP_DAY5',
    eventType: 'subscription_notification_day5',
    channel: 'app_impetus',
    severity: 'medium',
    escalationLevel: 2
  }),
  7: Object.freeze({
    phase: 'DAY_7_NC',
    policyId: 'BILLING_NC_DAY7',
    eventType: 'subscription_notification_day7',
    channel: 'notification_center',
    severity: 'high',
    escalationLevel: 3
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

function isBillingGovernanceEnabled() {
  return String(process.env.EVENT_GOVERNANCE_BILLING || '').toLowerCase() === 'true';
}

function getDayConfig(billingDay) {
  return BILLING_DAY_CONFIG[Number(billingDay)] || null;
}

function mapPhaseToDay(phase) {
  const p = String(phase || '').toUpperCase();
  if (p.includes('DAY_3') || p.includes('EMAIL')) return 3;
  if (p.includes('DAY_5') || p.includes('APP')) return 5;
  if (p.includes('DAY_7') || p.includes('NC')) return 7;
  return null;
}

/**
 * @param {object} input
 * @returns {object}
 */
function buildGovernanceEvent(input) {
  const billingDay = input.billingDay ?? mapPhaseToDay(input.phase);
  const cfg = getDayConfig(billingDay);
  if (!cfg) {
    throw new Error(`billingDay inválido: ${billingDay}`);
  }

  return {
    companyId: input.companyId,
    eventType: cfg.eventType,
    category: 'billing',
    severity: normalizeSeverity(input.severity || cfg.severity),
    sourceModule: 'subscriptionBillingNotificationService',
    payload: {
      billingDay,
      phase: cfg.phase,
      subscriptionId: input.subscriptionId || null,
      daysOverdue: input.daysOverdue,
      message: input.message || '',
      to: input.recipientEmail,
      email: input.recipientEmail,
      phone: input.recipientPhone,
      companyName: input.companyName,
      gracePeriodDays: input.gracePeriodDays,
      dueDate: input.dueDate,
      billingOverdue: billingDay === 3,
      recipientUserIds: input.recipientUserIds || [],
      type: 'billing_governance'
    }
  };
}

/**
 * @param {object} input
 */
function inferLegacyDistribution(input) {
  const billingDay = input.billingDay ?? mapPhaseToDay(input.phase);
  const cfg = getDayConfig(billingDay);
  if (!cfg) {
    return { severity: 'medium', channels: [], escalationLevel: 0, policyId: null };
  }

  const channels = [cfg.channel];
  const recipientCount =
    billingDay === 3
      ? input.recipientEmail
        ? 1
        : 0
      : billingDay === 5
        ? input.recipientPhone
          ? 1
          : 0
        : Array.isArray(input.recipientUserIds)
          ? input.recipientUserIds.length
          : 0;

  return {
    billingDay,
    policyId: cfg.policyId,
    severity: normalizeSeverity(cfg.severity),
    channels,
    escalationLevel: cfg.escalationLevel,
    recipientCount
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

async function _executeGovernanceDistribution(companyId, input, governanceResult) {
  const billingDay = Number(input.billingDay);
  const steps = (governanceResult.execution?.executionPlan || []).filter(
    (step) => step.validationPassed
  );
  const results = [];

  for (const step of steps) {
    if (billingDay === 3 && step.channel === 'email') {
      const r = await eventGovernanceExecution.executePlan({
        executable: true,
        executionPlan: [step],
        decisionRef: governanceResult.execution.decisionRef,
        companyId,
        payload: {
          to: input.recipientEmail,
          billingOverdue: true,
          companyName: input.companyName,
          daysOverdue: input.daysOverdue,
          gracePeriodDays: input.gracePeriodDays,
          dueDate: input.dueDate,
          subject: `[IMPETUS] Assinatura em atraso - ${input.companyName || 'Regularize seu pagamento'}`
        }
      });
      results.push(r);
    } else if (billingDay === 5 && step.channel === 'app_impetus') {
      const r = await eventGovernanceExecution.executePlan({
        executable: true,
        executionPlan: [step],
        decisionRef: governanceResult.execution.decisionRef,
        companyId,
        payload: {
          message: input.message,
          phone: input.recipientPhone,
          originatedFrom: 'subscription'
        }
      });
      results.push(r);
    } else if (billingDay === 7 && step.channel === 'notification_center') {
      for (const userId of input.recipientUserIds || []) {
        const r = await eventGovernanceExecution.executePlan({
          executable: true,
          executionPlan: [step],
          decisionRef: governanceResult.execution.decisionRef,
          companyId,
          payload: {
            message: input.message,
            userId,
            type: 'warning'
          }
        });
        results.push(r);
      }
    }
  }

  const success = results.some((r) => r.success === true);
  return { executed: results.length, results, success };
}

/**
 * Fluxo legado de envio (sem alterar dedupe — caller regista).
 * @param {object} input
 * @returns {Promise<boolean>}
 */
async function runLegacyDistribution(input) {
  const billingDay = Number(input.billingDay);

  if (billingDay === 3) {
    const { sendOverdueNotificationEmail } = require('../emailService');
    const sent = await sendOverdueNotificationEmail({
      to: input.recipientEmail,
      companyName: input.companyName,
      daysOverdue: input.daysOverdue,
      gracePeriodDays: input.gracePeriodDays || 10,
      dueDate: input.dueDate
    });
    return sent === true;
  }

  if (billingDay === 5) {
    const appImpetusService = require('../appImpetusService');
    const phone = String(input.recipientPhone || '').replace(/\D/g, '');
    if (phone.length < 10 || !input.message) return false;
    const result = await appImpetusService.sendMessage(input.companyId, phone, input.message, {
      originatedFrom: 'subscription'
    });
    return result?.ok === true;
  }

  if (billingDay === 7) {
    const unifiedMessaging = require('../unifiedMessagingService');
    let sentCount = 0;
    for (const userId of input.recipientUserIds || []) {
      try {
        const result = await unifiedMessaging.sendToUser(input.companyId, userId, input.message, {
          type: 'warning'
        });
        if (result?.ok) sentCount += 1;
      } catch (err) {
        console.warn('[billingGovernanceAdapter][legacy_nc]', userId, err?.message ?? err);
      }
    }
    return sentCount > 0;
  }

  return false;
}

/**
 * @param {object} input
 */
async function dispatchBillingNotification(input) {
  const billingDay = input.billingDay ?? mapPhaseToDay(input.phase);
  if (!getDayConfig(billingDay)) {
    return { skipped: true, reason: 'invalid_billing_day', useLegacy: true };
  }

  if (!input.companyId) {
    return { skipped: true, reason: 'missing_companyId', useLegacy: true };
  }

  _stats.events_evaluated += 1;
  _metric(METRIC_EVENTS);

  const migrated = isBillingGovernanceEnabled();
  const event = buildGovernanceEvent({ ...input, billingDay });
  const legacy = inferLegacyDistribution({ ...input, billingDay });

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
      { ...input, billingDay },
      governanceResult
    );

    return {
      mode: 'governance',
      useLegacy: !distribution.success,
      governanceResult,
      distribution
    };
  } catch (err) {
    console.warn('[billingGovernanceAdapter][dispatch]', err?.message ?? err);
    return {
      mode: 'legacy_fallback',
      useLegacy: true,
      error: err?.message || 'governance_error'
    };
  }
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  const enabled = isBillingGovernanceEnabled();

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
  isBillingGovernanceEnabled,
  getDayConfig,
  mapPhaseToDay,
  buildGovernanceEvent,
  inferLegacyDistribution,
  compareShadow,
  dispatchBillingNotification,
  runLegacyDistribution,
  getAuditStatus,
  resetStatsForTests,
  BILLING_DAY_CONFIG,
  METRIC_EVENTS,
  METRIC_MIGRATED,
  METRIC_SHADOW_TOTAL,
  METRIC_SHADOW_MATCH,
  METRIC_SHADOW_DIVERGENCE
};
