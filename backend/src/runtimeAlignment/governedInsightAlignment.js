'use strict';

function alignInsightResponse(insights, ctx = {}) {
  const list = Array.isArray(insights) ? insights : insights ? [insights] : [];
  const hasContent = list.length > 0 && list.some((i) => i && (i.text || i.message));

  if (hasContent) {
    return {
      insights: list,
      contextual_integrity_score: 0.88,
      semantic_alignment_score: 0.86,
      governance_confidence: 0.82
    };
  }

  return {
    insights: [],
    contextual_insufficiency: true,
    contextual_integrity_score: 0.3,
    semantic_alignment_score: 0.4,
    governance_confidence: 0.25,
    explanation: {
      code: 'INSIGHT_CONTEXTUAL_GAP',
      message: 'Insights não disponíveis — sem inferência heurística cross-domain.',
      confidence: 'low'
    }
  };
}

module.exports = { alignInsightResponse };
