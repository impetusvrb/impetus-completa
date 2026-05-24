'use strict';

const flags = require('../config/sz2FeatureFlags');
const conv = require('../memory/zConversationMemoryGraph');
const { resolveImplicitIntent } = require('./zImplicitIntentResolutionRuntime');
const { buildConversationContinuation } = require('./zConversationContinuationRuntime');
const { buildWorkflowContinuation } = require('./zWorkflowContinuationRuntime');
const { buildOperationalContinuity } = require('./zOperationalContinuityRuntime');

/**
 * Combina os sinais de continuidade conversacional, workflow e operacional
 * para devolver um descritor único:
 *
 *   inherited_context: contexto que a IA deve assumir sem voltar a pedir
 *   continuation_score: 0..1
 */
function buildIntentContinuity(tenantId, user = {}, currentMessage = '') {
  if (!flags.isContinuityEnabled()) {
    return { skipped: true, reason: 'continuity_disabled' };
  }

  const recentTurns = conv.recentTurns(tenantId, 20);
  const implicit = resolveImplicitIntent(currentMessage, recentTurns);
  const conversation = buildConversationContinuation(tenantId, currentMessage, 60);
  const workflow = buildWorkflowContinuation(tenantId);
  const operational = buildOperationalContinuity(tenantId);

  const inherited_context = implicit.inherited_from
    ? {
        from_turn_id: implicit.inherited_from.turn_id,
        summary: implicit.inherited_from.summary,
        intent: implicit.inherited_from.intent,
        anchors: implicit.anchors
      }
    : null;

  const continuation_score = Number(
    Math.min(
      1,
      (conversation.has_continuity ? 0.35 : 0) +
        (workflow.has_active_workflow ? 0.25 : 0) +
        (operational.has_operational_continuity ? 0.2 : 0) +
        (implicit.implicit && inherited_context ? 0.2 : 0)
    ).toFixed(3)
  );

  return {
    user_id: user?.id || null,
    current_message_excerpt: String(currentMessage || '').slice(0, 160),
    implicit,
    inherited_context,
    conversation,
    workflow,
    operational,
    continuation_score,
    assistive_only: true,
    auto_execution: false
  };
}

module.exports = { buildIntentContinuity };
