'use strict';

const { extractSummaryText } = require('./summaryTextExtractor');

function assureOperationalNarrative(summaryPayload = {}, ctx = {}) {
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  if (tier !== 'operational') return { assured: true, not_applicable: true };
  const text = extractSummaryText(summaryPayload);
  const guidance = /operacional|ação|prioridade|linha|turno|manutenção|checklist|próximo passo/i.test(text);
  return { assured: guidance || text.length < 30, operational_guidance: guidance };
}

module.exports = { assureOperationalNarrative };
