'use strict';

function computeExecutiveCognitiveHealth({ usefulness = 0.8, convergence = 0.7, isolation_ok = true, aggregation_ready = true }) {
  const score = (usefulness * 0.35 + convergence * 0.25 + (isolation_ok ? 0.25 : 0) + (aggregation_ready ? 0.15 : 0));
  return {
    executive_cognitive_health: {
      score: Math.round(score * 100) / 100,
      useful: score >= 0.75,
      strategic_centric: true
    }
  };
}

module.exports = { computeExecutiveCognitiveHealth };
