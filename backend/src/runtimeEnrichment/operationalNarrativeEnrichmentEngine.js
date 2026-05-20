'use strict';

const { extractSummaryText } = require('../summaryRollout/summaryPayloadUtils');
const { extractReplyText } = require('../chatAlignment/chatPayloadUtils');

function enrichOperationalNarrative(payload, ctx = {}) {
  const summary = extractSummaryText(payload?.summary || payload);
  const chat = extractReplyText(payload?.reply ? payload : ctx.chat_payload);
  const combined = `${summary} ${chat}`.trim();
  const len = combined.length;
  const hasNumbers = /\d/.test(combined);
  const hasAction = /\b(recomend|prioriz|verificar|ação)\b/i.test(combined);

  const narrative_density = Number(
    Math.min(1, len / 500 + (hasNumbers ? 0.25 : 0) + (hasAction ? 0.25 : 0.1)).toFixed(4)
  );

  return {
    narrative_density,
    contextual_grounding: hasNumbers && hasAction ? 0.88 : hasAction ? 0.72 : 0.55,
    explainability_hints: narrative_density < 0.5
      ? ['Aumentar grounding com métricas reais existentes — sem fabricar valores']
      : [],
    auto_rewrite: false,
    invented_narrative: false
  };
}

module.exports = { enrichOperationalNarrative };
