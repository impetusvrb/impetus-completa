'use strict';

const { extractSummaryText } = require('../summaryConvergence/summaryTextExtractor');

const FORBIDDEN_BY_TIER = {
  operational: ['board', 'trimestre estratég', 'margem consolidada'],
  executive: ['checklist de manutenção', 'linha 3', 'turno operacional']
};

function analyzeHierarchyNarrativeTargeting(summaryPayload = {}, ctx = {}) {
  const text = extractSummaryText(summaryPayload).toLowerCase();
  const tier = String(ctx.hierarchy_tier || 'coordination').toLowerCase();
  const forbidden = FORBIDDEN_BY_TIER[tier] || [];
  const leaks = forbidden.filter((f) => text.includes(f));

  return {
    tier,
    leaks,
    hierarchy_mismatch: leaks.length > 0,
    narrative_leakage: leaks.length > 0
  };
}

module.exports = { analyzeHierarchyNarrativeTargeting, FORBIDDEN_BY_TIER };
