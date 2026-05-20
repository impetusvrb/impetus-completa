'use strict';

const { normalizeAxis } = require('../kpiRollout/kpiDomainRegistry');

function extractReplyText(chatPayload) {
  if (typeof chatPayload === 'string') return chatPayload;
  return String(
    chatPayload?.reply || chatPayload?.message || chatPayload?.content || chatPayload?.text || ''
  );
}

function extractUserMessage(ctx = {}) {
  return String(ctx.user_message || ctx.message || '');
}

function buildChatContext(user, ctx = {}) {
  return {
    functional_axis: normalizeAxis(ctx.functional_axis || user?.functional_axis || user?.functional_area),
    tenant_id: user?.company_id,
    runtime_truth_axis: ctx.runtime_truth_state?.canonical_axis || ctx.runtime_truth_axis,
    contextual_delivery: ctx.contextual_delivery,
    runtime_consistency: ctx.runtime_consistency,
    summary_excerpt: ctx.summary_excerpt || ctx.summary_text,
    kpi_context: ctx.kpi_context
  };
}

module.exports = { extractReplyText, extractUserMessage, buildChatContext, normalizeAxis };
