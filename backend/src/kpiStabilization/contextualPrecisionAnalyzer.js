'use strict';

const { measureKpiContextualPrecision } = require('../kpiRollout/kpiContextualPrecision');
const { validateContextualKpiSemantics } = require('./contextualKpiSemanticValidator');

function analyzeContextualPrecision(user, kpiPayload, ctx = {}) {
  const contextual = measureKpiContextualPrecision(user, kpiPayload, ctx);
  const semantic = validateContextualKpiSemantics(user, kpiPayload, ctx);
  return {
    contextual_alignment_score: Number(
      ((contextual.KPI_contextual_precision + semantic.contextual_alignment_score) / 2).toFixed(4)
    ),
    contextual,
    semantic
  };
}

module.exports = { analyzeContextualPrecision };
