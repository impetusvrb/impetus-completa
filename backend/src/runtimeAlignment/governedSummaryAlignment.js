'use strict';

function alignSummaryResponse(summary, ctx = {}) {
  const text = summary?.summary || summary?.text || '';
  const unavailable =
    !text ||
    /indisponível|indisponivel|sem dados|insufficient|unavailable/i.test(text);

  if (!unavailable) {
    return {
      summary,
      contextual_insufficiency: false,
      contextual_integrity_score: 0.9,
      semantic_alignment_score: 0.88,
      governance_confidence: 0.85
    };
  }

  return {
    summary: {
      ...summary,
      summary: text || 'Resumo indisponível para o contexto actual.',
      _governance: {
        contextual_insufficiency: true,
        do_not_invent: true,
        legacy_enricher_bypassed: ctx.legacy_enricher_blocked === true
      }
    },
    contextual_insufficiency: true,
    contextual_integrity_score: 0.35,
    semantic_alignment_score: 0.45,
    governance_confidence: 0.3,
    explanation: {
      code: 'SUMMARY_CONTEXTUAL_GAP',
      message: 'Summary depende de enrichers legacy ou dados scoped em falta.',
      missing_dependencies: ['operational_summary_feed', 'governed_enricher']
    }
  };
}

module.exports = { alignSummaryResponse };
