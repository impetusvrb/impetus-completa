import { resolveGovernanceLearning } from './governanceLearningResolver';
import { applyLearningRecommendations } from './learningRecommendationAdapter';
import { applyLearningTrends } from './learningTrendAdapter';

export function enrichContextWithGovernanceLearning(context, meData = {}) {
  const gl = resolveGovernanceLearning(meData);
  if (!gl) return context;
  let enriched = { ...context, governance_learning: gl.governance_learning };
  enriched = applyLearningRecommendations(enriched, gl.governance_learning);
  enriched = applyLearningTrends(enriched, gl.governance_learning);
  return enriched;
}

export default enrichContextWithGovernanceLearning;
