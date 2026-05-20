'use strict';

const { computeContextualPrecision } = require('./contextualPrecisionEngine');

function scoreKpiContextualPrecision(user, ctx = {}) {
  const base = computeContextualPrecision(user, ctx);
  return {
    kpi_context_sufficient: base.sufficient,
    contextual_precision_score: base.contextual_precision_score,
    insufficient_reason: base.sufficient ? null : 'contextual_insufficiency'
  };
}

module.exports = { scoreKpiContextualPrecision };
