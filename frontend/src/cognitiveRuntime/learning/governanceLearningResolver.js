export function resolveGovernanceLearning(meData = {}) {
  const gl = meData?.governance_learning;
  if (!gl?.learning_active) return null;
  return {
    governance_learning: gl,
    recommendations: gl.recommendations_generated || [],
    patterns: gl.patterns_detected || [],
    supervised: gl.auto_mutation_applied === false
  };
}

export default resolveGovernanceLearning;
