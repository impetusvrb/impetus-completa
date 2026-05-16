'use strict';

/**
 * IA apenas assistiva — texto de sugestão sem aprovação ou encerramento.
 */
const flags = require('../qualityGovernanceRuntimeFlags');

function contextualSuggestion(ctx = {}) {
  if (!flags.isQualityAiAssistanceEnabled()) {
    return { enabled: false, text: null };
  }
  const parts = [];
  if (ctx.line) parts.push(`Linha ${ctx.line}`);
  if (ctx.supplier) parts.push(`fornecedor ${ctx.supplier}`);
  if (ctx.metric) parts.push(`indicador ${ctx.metric}`);
  const head = parts.length ? `${parts.join(' · ')}: ` : '';
  return {
    enabled: true,
    text: `${head}sugerido rever tendência recente e correlacionar com lotes abertos (ação humana obrigatória).`,
    non_authoritative: true
  };
}

module.exports = {
  contextualSuggestion
};
