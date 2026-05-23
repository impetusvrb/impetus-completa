export function applyLearningRecommendations(context = {}, gl = null) {
  if (!gl?.recommendations_generated?.length) return context;
  return {
    ...context,
    governance_recommendations: gl.recommendations_generated,
    learning_advisory: true
  };
}

export default applyLearningRecommendations;
