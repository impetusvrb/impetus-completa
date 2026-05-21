'use strict';

const { inferHierarchyBand } = require('../kpiRollout/hierarchyKpiValidator');
const { extractSummaryText } = require('./summaryTextExtractor');

function measureHierarchyNarrativeConvergence(user = {}, summaryPayload = {}, ctx = {}) {
  const text = extractSummaryText(summaryPayload).toLowerCase();
  const band = inferHierarchyBand(user, ctx);
  const tier = String(ctx.hierarchy_tier || band || '').toLowerCase();

  const execTerms = /estratég|board|executiv|margem|revenue|esg/i.test(text);
  const opTerms = /operacional|linha|oee|produção|producao|turno|manutenção/i.test(text);
  let aligned = true;
  if (tier === 'operational' && execTerms && !opTerms) aligned = false;
  if (['executive', 'director'].includes(tier) && opTerms && !execTerms && text.length > 80) aligned = false;

  return { converged: aligned, hierarchy_band: band, tier, exec_terms: execTerms, op_terms: opTerms };
}

module.exports = { measureHierarchyNarrativeConvergence };
