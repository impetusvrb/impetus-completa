'use strict';

const phaseW = require('./config/phaseWFeatureFlags');
const { logPhaseW } = require('./phaseWLogger');
const { extractReplyText } = require('./chatPayloadUtils');

function validateChatNarrativeIntegrity(user, chatPayload, ctx = {}) {
  const reply = extractReplyText(chatPayload);
  const summary = String(ctx.summary_excerpt || '');
  const issues = [];

  if (summary && reply) {
    const sumNums = (summary.match(/\d+([.,]\d+)?%?/g) || []).slice(0, 5);
    const replyNums = (reply.match(/\d+([.,]\d+)?%?/g) || []).slice(0, 5);
    const conflicting = sumNums.filter((n) => {
      return replyNums.some((r) => r !== n && Math.abs(parseFloat(r) - parseFloat(n)) > 5);
    });
    if (conflicting.length > 0) {
      issues.push({ type: 'summary_chat_numeric_divergence', severity: 'high' });
    }
  }

  if (ctx.kpi_context && reply.length > 100) {
    const kpiMention = /\b(kpi|indicador|meta|threshold)\b/i.test(reply);
    if (!kpiMention && ctx.kpi_context.expect_kpi_reference) {
      issues.push({ type: 'kpi_narrative_gap', severity: 'low' });
    }
  }

  if (reply.split(/\n\n/).length === 1 && reply.length > 400 && !/\b(próximo passo|recomendo|prioridade)\b/i.test(reply)) {
    issues.push({ type: 'weak_guidance_structure', severity: 'medium' });
  }

  const integrity = Number(Math.max(0.5, 1 - issues.length * 0.12).toFixed(4));

  if (issues.some((i) => i.severity === 'high') && phaseW.isChatRuntimeObservabilityEnabled()) {
    logPhaseW('NARRATIVE_INCONSISTENCY_DETECTED', { count: issues.length, shadow_only: true });
  }

  return {
    narrative_integrity: integrity,
    valid: issues.filter((i) => i.severity === 'critical').length === 0,
    issues,
    auto_correct: false
  };
}

module.exports = { validateChatNarrativeIntegrity };
