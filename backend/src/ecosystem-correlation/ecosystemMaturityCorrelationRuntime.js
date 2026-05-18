'use strict';

const cognitive = require('../runtime-validation/enterpriseCognitiveMaturityEngine');
const maturity = require('../domains/environment/pilot-rollout/environmentOperationalMaturityScoring');

function ecosystemMaturityCorrelationRuntime(ctx = {}) {
  const envMat = maturity.scoreOperationalMaturity(ctx.environment_metrics || {});
  const cog = cognitive.analyzeCognitiveMaturity(ctx.cognitive_input || {});
  const contextual = (envMat.maturity_score + (cog.rollout_readiness_score || 0)) / 2;
  return {
    ok: true,
    environment_maturity: envMat,
    cognitive_maturity: cog,
    ecosystem_contextual_maturity_score: contextual,
    assistive_only: true
  };
}

module.exports = { ecosystemMaturityCorrelationRuntime };
