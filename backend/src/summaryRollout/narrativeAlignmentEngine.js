'use strict';

const { validateContextualNarrative } = require('./contextualNarrativeValidator');
const { extractSummaryMeta, normalizeAxis } = require('./summaryPayloadUtils');

function alignNarrative(user, summaryPayload, ctx = {}) {
  const narrative = validateContextualNarrative(user, summaryPayload, ctx);
  const meta = extractSummaryMeta(summaryPayload);
  const userAxis = normalizeAxis(ctx.functional_axis || user?.functional_axis);
  const axisMatch = meta.axis === userAxis || meta.axis === 'general' || !meta.axis;

  const alignment = Number(
    ((narrative.narrative_integrity + (axisMatch ? 0.9 : 0.55)) / 2).toFixed(4)
  );

  return {
    narrative_alignment_score: alignment,
    narrative_integrity: narrative.narrative_integrity,
    axis_aligned: axisMatch,
    issues: narrative.issues,
    recommendations: narrative.issues.length
      ? ['Recomendação: alinhar narrativa ao contexto operacional — sem reescrita automática']
      : [],
    auto_correct: false
  };
}

module.exports = { alignNarrative };
