'use strict';

const { extractSummaryText } = require('./summaryTextExtractor');

function measureFunctionalNarrativeConvergence(summaryPayload = {}, ctx = {}) {
  const text = extractSummaryText(summaryPayload).toLowerCase();
  const axis = String(ctx.domain_axis || ctx.functional_axis || '').toLowerCase();
  if (!axis || !text) return { converged: true, targeting_precision: 1 };

  const axisHints = {
    hr: /rh|pessoas|headcount|turnover|colaborador/,
    safety: /sst|segurança|incidente|loto/,
    environment: /ambient|emiss|esg|resíduo/,
    operations: /operacional|linha|oee|produção/
  };
  const hint = axisHints[axis];
  const aligned = !hint || hint.test(text) || text.length < 40;
  return {
    converged: aligned,
    functional_axis: axis,
    targeting_precision: aligned ? 0.85 : 0.45
  };
}

module.exports = { measureFunctionalNarrativeConvergence };
