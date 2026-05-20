'use strict';

const { buildChatContext, extractReplyText, extractUserMessage } = require('./chatPayloadUtils');
const { guardChatHierarchyIsolation } = require('./chatHierarchyIsolationGuard');
const { inferHierarchyBand } = require('../kpiRollout/hierarchyKpiValidator');

function alignChatContextually(user, chatPayload, ctx = {}) {
  const chatCtx = buildChatContext(user, ctx);
  const hierarchy = guardChatHierarchyIsolation(user, chatPayload, chatCtx);
  const band = inferHierarchyBand(user, chatCtx);
  const reply = extractReplyText(chatPayload);
  const userMsg = extractUserMessage(ctx);

  const runtimeTruthOk =
    !chatCtx.runtime_truth_axis ||
    chatCtx.runtime_truth_axis === chatCtx.functional_axis ||
    chatCtx.runtime_truth_axis === 'general';

  const consistencyOk = !ctx.runtime_consistency?.interchannel?.divergence_detected;

  const alignment_score = Number(
    (
      (hierarchy.isolated ? 0.9 : 0.55) *
      (runtimeTruthOk ? 1 : 0.85) *
      (consistencyOk ? 1 : 0.8)
    ).toFixed(4)
  );

  return {
    alignment_score,
    functional_axis: chatCtx.functional_axis,
    hierarchy_band: band,
    runtime_truth_aligned: runtimeTruthOk,
    consistency_aligned: consistencyOk,
    contextual_delivery_present: !!ctx.contextual_delivery,
    reply_length: reply.length,
    user_message_length: userMsg.length,
    hierarchy,
    recommendations: !hierarchy.isolated
      ? ['Recomendação: alinhar resposta ao cargo/domínio — sem reescrita automática']
      : [],
    auto_correct: false
  };
}

module.exports = { alignChatContextually };
