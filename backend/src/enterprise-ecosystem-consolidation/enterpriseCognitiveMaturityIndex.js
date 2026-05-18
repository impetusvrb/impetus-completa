'use strict';

const cognitive = require('../runtime-validation/enterpriseCognitiveMaturityEngine');
const overload = require('../enterprise-shadow-stabilization/cognitiveOverloadReductionLayer');

/**
 * Fase 3 — Enterprise Cognitive Maturity Index (ECMI).
 */
function computeEnterpriseCognitiveMaturityIndex(input = {}) {
  const maturity = cognitive.analyzeCognitiveMaturity(input);
  const reduction = overload.analyzeOverloadReduction(input);

  const pressures = {
    cognitive: maturity.cognitive_overload,
    operational: maturity.operational_maturity_score < 50,
    contextual: maturity.contextual_fatigue,
    workflow: maturity.workflow_branching_overload,
    decision: (input.decision_density || 0) > 15
  };

  const overloadCount = Object.values(pressures).filter(Boolean).length;
  const ecmi = Math.round(
    (maturity.cognitive_maturity_score +
      maturity.operational_maturity_score +
      maturity.contextual_maturity_score) /
      3 -
      overloadCount * 8
  );

  return {
    ok: true,
    enterprise_cognitive_maturity_index: Math.max(0, Math.min(100, ecmi)),
    cognitive_maturity_score: maturity.cognitive_maturity_score,
    operational_maturity_score: maturity.operational_maturity_score,
    contextual_maturity_score: maturity.contextual_maturity_score,
    rollout_readiness_score: maturity.rollout_readiness_score,
    pressures,
    overload_count: overloadCount,
    saturation_analysis: pressures,
    recommended_actions: reduction.recommended_actions,
    acceptable_for_environment: ecmi >= 48 && !maturity.cognitive_overload && overloadCount <= 2
  };
}

module.exports = { computeEnterpriseCognitiveMaturityIndex };
