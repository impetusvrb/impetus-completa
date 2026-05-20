'use strict';

const phaseR = require('./config/phaseRFeatureFlags');
const { evaluateContextualRecommendation } = require('./contextualRecommendationEvaluator');

function analyzeRecommendationQuality(recommendation = {}, ctx = {}) {
  const analysis = evaluateContextualRecommendation(recommendation, ctx);
  return {
    ...analysis,
    clarity: recommendation.text && recommendation.text.length > 50 ? 0.85 : 0.5,
    coherence: ctx.cognitive_consistency_score ?? 0.85,
    enforcement_active: phaseR.isRecommendationQualityAnalysisEnabled(),
    shadow_only: !phaseR.isRecommendationQualityAnalysisEnabled()
  };
}

module.exports = { analyzeRecommendationQuality };
