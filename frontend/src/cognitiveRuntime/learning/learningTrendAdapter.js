export function applyLearningTrends(context = {}, gl = null) {
  if (!gl) return context;
  return {
    ...context,
    usefulness_trends: gl.usefulness_trends || [],
    convergence_trends: gl.convergence_trends || []
  };
}

export default applyLearningTrends;
