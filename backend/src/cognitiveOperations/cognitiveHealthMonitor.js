'use strict';

function computeCognitiveRuntimeHealth(signals = {}) {
  const convergence = signals.convergence_health ?? 0.85;
  const truth = signals.truth_integrity ?? 0.88;
  const contextual = signals.contextual_integrity ?? 0.86;
  const governance = signals.governance_operational_health ?? 0.84;

  const cognitive_runtime_health = Number(
    ((convergence + truth + contextual + governance) / 4).toFixed(4)
  );

  return {
    cognitive_runtime_health,
    components: { convergence, truth, contextual, governance },
    status: cognitive_runtime_health >= 0.8 ? 'healthy' : cognitive_runtime_health >= 0.65 ? 'degraded' : 'critical'
  };
}

module.exports = { computeCognitiveRuntimeHealth };
