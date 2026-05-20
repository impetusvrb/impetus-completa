'use strict';

const phaseW = require('./config/phaseWFeatureFlags');
const { logPhaseW } = require('./phaseWLogger');
const { extractReplyText, extractUserMessage, normalizeAxis } = require('./chatPayloadUtils');
const { guardChatHierarchyIsolation } = require('./chatHierarchyIsolationGuard');

function detectChatLeakage(user, chatPayload, ctx = {}) {
  const reply = extractReplyText(chatPayload);
  const userMsg = extractUserMessage(ctx);
  const userAxis = normalizeAxis(ctx.functional_axis || user?.functional_axis);
  const hierarchy = guardChatHierarchyIsolation(user, chatPayload, ctx);
  const leaks = [...hierarchy.violations];

  if (ctx.summary_excerpt && reply.length > 20) {
    const sumWords = new Set(String(ctx.summary_excerpt).toLowerCase().split(/\s+/).filter((w) => w.length > 5));
    const replyWords = reply.toLowerCase().split(/\s+/);
    const orphan = replyWords.filter((w) => w.length > 6 && !sumWords.has(w) && !userMsg.toLowerCase().includes(w));
    if (orphan.length > 8) {
      leaks.push({ type: 'orphan_conversational_context', severity: 'low', count: orphan.length });
    }
  }

  if (userAxis && userAxis !== 'general') {
    const axisMentioned = new RegExp(userAxis.replace('_', ' '), 'i').test(reply);
    if (!axisMentioned && reply.length > 200 && !/\b(operacional|industrial|planta)\b/i.test(reply)) {
      leaks.push({ type: 'contextual_leakage', severity: 'medium', expected_axis: userAxis });
    }
  }

  if (leaks.length && phaseW.isChatRuntimeObservabilityEnabled()) {
    logPhaseW('CHAT_CONTEXTUAL_LEAKAGE_DETECTED', { count: leaks.length, tenant_id: ctx.tenant_id, shadow_only: true });
  }

  return {
    leakage_detected: leaks.length > 0,
    leakage_count: leaks.length,
    leaks,
    hierarchy,
    auto_block: false,
    enforcement_active: phaseW.isChatLeakageDetectionEnabled()
  };
}

module.exports = { detectChatLeakage };
