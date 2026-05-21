'use strict';

const { extractSummaryText } = require('../summaryConvergence/summaryTextExtractor');

function analyzeFunctionalNarrativeTargeting(summaryPayload = {}, ctx = {}) {
  const text = extractSummaryText(summaryPayload).toLowerCase();
  const axis = String(ctx.functional_axis || ctx.domain_axis || '').toLowerCase();
  const domainKeywords = {
    financial: ['margem', 'financeiro'],
    operations: ['linha', 'produção', 'turno'],
    hr: ['rh', 'colaborador']
  };
  const expected = domainKeywords[axis] || [];
  const matched = expected.filter((k) => text.includes(k));

  return {
    functional_axis: axis,
    expected_signals: expected,
    matched,
    cross_domain_risk: axis && expected.length > 0 && matched.length === 0 && text.length > 40
  };
}

module.exports = { analyzeFunctionalNarrativeTargeting };
