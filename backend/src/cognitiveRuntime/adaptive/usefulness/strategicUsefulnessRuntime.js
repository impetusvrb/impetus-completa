'use strict';

function scoreStrategicUsefulness(payload = {}) {
  const exec = payload.executive_cognitive_runtime;
  if (!exec?.consolidation_applied) return { strategic_usefulness: null, applicable: false };
  const health = exec.executive_cognitive_health?.score ?? 0.78;
  const convergence = exec.strategic?.convergence ?? exec.convergence_validation?.aligned ? 0.8 : 0.6;
  return {
    applicable: true,
    strategic_usefulness: Math.round(((health + convergence) / 2) * 100) / 100
  };
}

module.exports = { scoreStrategicUsefulness };
