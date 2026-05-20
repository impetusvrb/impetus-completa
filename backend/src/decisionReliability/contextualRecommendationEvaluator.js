'use strict';

const { scoreOperationalRecommendation } = require('./operationalRecommendationScorer');

function evaluateContextualRecommendation(rec = {}, ctx = {}) {
  const ops = scoreOperationalRecommendation(rec);
  const axis = ctx.functional_axis || ctx.canonical_axis;
  const aligned = !rec.domain || !axis || rec.domain === axis;
  const contextual_alignment_quality = aligned ? 0.9 : 0.45;
  const recommendation_quality = Number(
    ((ops.operational_usefulness + contextual_alignment_quality) / 2).toFixed(4)
  );
  return {
    recommendation_quality,
    contextual_alignment_quality,
    ...ops,
    aligned
  };
}

module.exports = { evaluateContextualRecommendation };
