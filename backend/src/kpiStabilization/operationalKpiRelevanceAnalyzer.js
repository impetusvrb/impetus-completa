'use strict';

const { validateContextualKpiSemantics } = require('./contextualKpiSemanticValidator');
const { extractKpiList } = require('../kpiRollout/kpiTargetingValidator');

function analyzeOperationalKpiRelevance(user, kpiPayload, ctx = {}) {
  const semantic = validateContextualKpiSemantics(user, kpiPayload, ctx);
  const kpis = extractKpiList(kpiPayload);
  const useful = kpis.filter((k) => !k.deprecated && !k.operational_irrelevant).length;
  const usefulness = kpis.length ? useful / kpis.length : 1;

  return {
    KPI_operational_usefulness: Number(usefulness.toFixed(4)),
    KPI_semantic_relevance: semantic.contextual_alignment_score,
    semantic,
    recommendations:
      usefulness < 0.7
        ? ['Rever KPIs com baixa utilidade operacional para o contexto actual']
        : []
  };
}

module.exports = { analyzeOperationalKpiRelevance };
