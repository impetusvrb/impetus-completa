'use strict';

const cognitive = require('../runtime-validation/enterpriseCognitiveMaturityEngine');
const overload = require('./cognitiveOverloadReductionLayer');

function runCognitiveMaturityValidation(input = {}) {
  const maturity = cognitive.analyzeCognitiveMaturity(input);
  const reduction = overload.analyzeOverloadReduction(input);

  const saturation = {
    cognitive: maturity.cognitive_overload,
    operational: maturity.operational_maturity_score < 50,
    workflow: maturity.workflow_branching_overload,
    contextual_fatigue: maturity.contextual_fatigue
  };

  return {
    ok: true,
    cognitive_maturity_score: maturity.cognitive_maturity_score,
    operational_maturity_score: maturity.operational_maturity_score,
    contextual_maturity_score: maturity.contextual_maturity_score,
    rollout_readiness_score: maturity.rollout_readiness_score,
    saturation_analysis: saturation,
    overload_reduction: reduction,
    acceptable_for_pilot: maturity.rollout_readiness_score >= 45 && !maturity.cognitive_overload
  };
}

module.exports = { runCognitiveMaturityValidation };
