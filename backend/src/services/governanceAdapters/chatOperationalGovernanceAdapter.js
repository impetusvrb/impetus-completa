'use strict';

/**
 * ECO-03 — adapter CHAT_OPERATIONAL → Event Governance v1.
 * Cobre operationalActionExecutor, operationalRealtimeCoordinator e escalonamento org AI (AI_PROACTIVE).
 */

const observability = require('../observabilityService');
const eventGovernanceExecution = require('../eventGovernanceExecutionService');
const ecoFlags = require('../ecoConvergenceFlags');
const { normalizeSeverity } = require('../../governance/severityNormalizer');

const METRIC_EVENTS = 'eco_chat_operational_events';
const METRIC_MIGRATED = 'eco_chat_operational_migrated';
const METRIC_SHADOW_TOTAL = 'eco_chat_operational_shadow_total';

/** @type {{ events: number, migrated: number, shadow: number }} */
const _stats = { events: 0, migrated: 0, shadow: 0 };

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

/**
 * @param {object} input
 * @returns {object}
 */
function buildGovernanceEvent(input) {
  const flow = input.flow || 'chat';
  const severity = normalizeSeverity(input.severity || 'medium');

  if (flow === 'org_ai') {
    return {
      companyId: input.companyId,
      eventType: input.eventType || 'ai_proactive',
      category: 'ai',
      severity,
      sourceModule: 'organizationalAI',
      payload: {
        message: input.message,
        phones: input.phones || [],
        recipientUserIds: input.recipientUserIds || [],
        escalationTargets: input.escalationTargets || [],
        originatedFrom: 'org_ai',
        type: input.type || 'organizational_escalation'
      }
    };
  }

  const sourceModule =
    flow === 'oae' ? 'operationalActionExecutor' : 'operationalRealtimeCoordinator';

  const recipientUserIds = Array.isArray(input.recipientUserIds)
    ? input.recipientUserIds
    : input.userId
      ? [input.userId]
      : (input.users || []).map((u) => u.id).filter(Boolean);

  return {
    companyId: input.companyId,
    eventType: input.eventType || (flow === 'oae' ? input.type || 'operational_decision' : 'operational_event'),
    category: 'operational',
    severity,
    sourceModule,
    payload: {
      message: input.message,
      userId: input.userId || recipientUserIds[0] || null,
      recipientUserIds,
      type: input.type || 'operational_event',
      routing: input.routing || null,
      metadata: input.metadata || {}
    }
  };
}

function inferLegacyDistribution(input) {
  const flow = input.flow || 'chat';
  const severity = normalizeSeverity(input.severity || 'medium');
  const channels = ['notification_center'];

  if (flow === 'chat') channels.push('chat');
  if (flow === 'org_ai') return { severity, channels: ['app_impetus', 'notification_center'], escalationLevel: 1 };

  let escalationLevel = 1;
  if (severity === 'high' || severity === 'critical') escalationLevel = 2;

  return { severity, channels, escalationLevel };
}

function _channelsEqual(a, b) {
  const setA = new Set(a || []);
  const setB = new Set(b || []);
  if (setA.size !== setB.size) return false;
  for (const ch of setA) if (!setB.has(ch)) return false;
  return true;
}

function compareShadow(legacy, governanceResult) {
  const evaluation = governanceResult.evaluation || {};
  const execution = governanceResult.execution || {};
  const decision = evaluation.decision || {};
  const govChannels = execution.channelsReady?.length
    ? execution.channelsReady
    : evaluation.channels || decision.channels || [];
  const govSeverity = decision.severity || legacy.severity;
  const govPolicy = evaluation.policyId || decision.policyId || null;
  const match =
    evaluation.approved === true &&
    legacy.severity === govSeverity &&
    _channelsEqual(legacy.channels, govChannels);

  return {
    match,
    legacy,
    governance: {
      policyId: govPolicy,
      severity: govSeverity,
      channels: govChannels,
      approved: evaluation.approved
    },
    divergence: match ? null : { policy: govPolicy }
  };
}

async function _runLegacy(input) {
  const flow = input.flow || 'chat';
  const companyId = input.companyId;
  const message = String(input.message || '').slice(0, 4000);

  if (flow === 'org_ai') {
    const phones = input.phones || [];
    const sent = [];
    const appImpetusService = require('../appImpetusService');
    for (const phone of [...new Set(phones)].slice(0, 10)) {
      try {
        await appImpetusService.sendMessage(companyId, phone, message, { originatedFrom: 'org_ai' });
        sent.push(phone);
      } catch (err) {
        console.warn('[chatOperationalGovernanceAdapter][legacy org_ai]', err?.message);
      }
    }
    return { ok: sent.length > 0, sent, mode: 'legacy' };
  }

  const unifiedMessaging = require('../unifiedMessagingService');
  const users = input.users || [];
  const userIds = input.userId
    ? [input.userId]
    : users.map((u) => u.id).filter(Boolean);

  const results = [];
  for (const userId of userIds) {
    try {
      const r = await unifiedMessaging.sendToUser(companyId, userId, message, {
        type: input.type || 'operational_event'
      });
      results.push({ userId, ok: r.ok === true, notificationId: r.notificationId });
    } catch (err) {
      results.push({ userId, ok: false, error: err?.message });
    }
  }

  return { ok: results.some((r) => r.ok), results, mode: 'legacy' };
}

async function _executeGovernanceDistribution(companyId, input, governanceResult) {
  const steps = (governanceResult.execution?.executionPlan || []).filter((s) => s.validationPassed);
  if (!steps.length) return { executed: 0, results: [], success: false };

  const message = String(input.message || '').slice(0, 4000);
  const results = [];
  const userIds = Array.isArray(input.recipientUserIds)
    ? input.recipientUserIds
    : input.userId
      ? [input.userId]
      : (input.users || []).map((u) => u.id).filter(Boolean);
  const phones = input.phones || [];

  for (const step of steps) {
    if (step.channel === 'notification_center') {
      for (const userId of userIds) {
        const r = await eventGovernanceExecution.executePlan({
          executable: true,
          executionPlan: [step],
          decisionRef: governanceResult.execution.decisionRef,
          companyId,
          payload: { message, userId, type: input.type || 'operational_event' }
        });
        results.push(r);
      }
    } else if (step.channel === 'chat') {
      const r = await eventGovernanceExecution.executePlan({
        executable: true,
        executionPlan: [step],
        decisionRef: governanceResult.execution.decisionRef,
        companyId,
        payload: {
          message,
          userId: userIds[0],
          conversationId: input.conversationId,
          type: input.type || 'operational_event'
        }
      });
      results.push(r);
    } else if (step.channel === 'app_impetus') {
      for (const phone of phones) {
        const r = await eventGovernanceExecution.executePlan({
          executable: true,
          executionPlan: [step],
          decisionRef: governanceResult.execution.decisionRef,
          companyId,
          payload: { message, phone, originatedFrom: 'org_ai', type: input.type || 'organizational_escalation' }
        });
        results.push(r);
      }
    }
  }

  const success = results.some((r) => r.ok === true || r.success === true);
  return { executed: results.length, results, success };
}

/**
 * @param {string} companyId
 * @param {object} input
 * @param {'oae'|'chat'|'org_ai'} flow
 */
async function dispatchChatOperational(companyId, input, flow) {
  if (!companyId || !input?.message) {
    return { skipped: true, reason: 'missing_params' };
  }

  const started = Date.now();
  const payload = { ...input, companyId, flow };
  const migrated = ecoFlags.isFlowMigrated(flow);

  _stats.events += 1;
  _metric(METRIC_EVENTS);

  const event = buildGovernanceEvent(payload);
  const legacyShape = inferLegacyDistribution(payload);

  let governanceResult;
  try {
    governanceResult = await eventGovernanceExecution.evaluatePrepareAndExecute(event);
  } catch (err) {
    console.warn('[chatOperationalGovernanceAdapter][evaluate]', err?.message);
    const legacy = await _runLegacy(payload);
    ecoFlags.recordObservation(flow, {
      mode: 'shadow',
      durationMs: Date.now() - started,
      match: false,
      success: legacy.ok
    });
    return { mode: 'fallback_legacy', error: err?.message, legacy };
  }

  const policyId =
    governanceResult.evaluation?.policyId ||
    governanceResult.evaluation?.decision?.policyId ||
    null;

  if (!migrated) {
    _stats.shadow += 1;
    _metric(METRIC_SHADOW_TOTAL);
    const legacy = await _runLegacy(payload);
    const comparison = compareShadow(legacyShape, governanceResult);
    ecoFlags.recordObservation(flow, {
      mode: 'shadow',
      durationMs: Date.now() - started,
      match: comparison.match,
      policyId,
      success: legacy.ok
    });
    return { mode: 'shadow', comparison, governanceResult, legacy, policyId };
  }

  _stats.migrated += 1;
  _metric(METRIC_MIGRATED);
  const distribution = await _executeGovernanceDistribution(companyId, payload, governanceResult);
  ecoFlags.recordObservation(flow, {
    mode: 'governance',
    durationMs: Date.now() - started,
    policyId,
    success: distribution.success
  });

  return { mode: 'governance', governanceResult, distribution, policyId };
}

async function dispatchOperationalActionNotification(companyId, input) {
  return dispatchChatOperational(companyId, { ...input, flow: 'oae' }, 'oae');
}

async function dispatchChatRealtimeNotification(companyId, input) {
  return dispatchChatOperational(companyId, { ...input, flow: 'chat' }, 'chat');
}

async function dispatchOrganizationalEscalation(companyId, input) {
  return dispatchChatOperational(companyId, { ...input, flow: 'org_ai' }, 'org_ai');
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  return {
    policy: 'CHAT_OPERATIONAL / AI_PROACTIVE (org_ai)',
    events_evaluated: _stats.events || metrics[METRIC_EVENTS] || 0,
    shadow_events: _stats.shadow || metrics[METRIC_SHADOW_TOTAL] || 0,
    migrated_events: _stats.migrated || metrics[METRIC_MIGRATED] || 0,
    eco_flags: ecoFlags.getAuditStatus().flags
  };
}

function resetStatsForTests() {
  _stats.events = 0;
  _stats.migrated = 0;
  _stats.shadow = 0;
}

module.exports = {
  buildGovernanceEvent,
  inferLegacyDistribution,
  compareShadow,
  dispatchChatOperational,
  dispatchOperationalActionNotification,
  dispatchChatRealtimeNotification,
  dispatchOrganizationalEscalation,
  getAuditStatus,
  resetStatsForTests
};
