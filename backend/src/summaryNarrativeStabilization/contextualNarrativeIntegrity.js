'use strict';

const { extractSummaryText, summaryWordCount } = require('../summaryConvergence/summaryTextExtractor');

const TIER_MARKERS = {
  executive: ['estratég', 'board', 'margem', 'trimestre', 'visão'],
  operational: ['linha', 'turno', 'checklist', 'manutenção', 'operacional'],
  coordination: ['coordenação', 'equipas', 'supervisor', 'gestão', 'semana']
};

function assessContextualNarrativeIntegrity(summaryPayload = {}, ctx = {}) {
  const text = extractSummaryText(summaryPayload).toLowerCase();
  const tier = String(ctx.hierarchy_tier || ctx.domain_axis || 'coordination').toLowerCase();
  const markers = TIER_MARKERS[tier] || TIER_MARKERS.coordination;
  const hits = markers.filter((m) => text.includes(m));
  const words = summaryWordCount(text);

  return {
    tier,
    integrity_score: text ? Math.min(1, (hits.length + (words >= 8 ? 1 : 0)) / 3) : 0,
    tier_markers_matched: hits,
    coherent: hits.length > 0 || words >= 12,
    unstable: words > 0 && words < 6
  };
}

module.exports = { assessContextualNarrativeIntegrity };
