'use strict';

const { logPhaseK } = require('../semanticGovernance/phaseKLogger');

function alignKpiResponse(kpis, ctx = {}) {
  const list = Array.isArray(kpis) ? kpis : [];
  const hasRealData = list.some((k) => k && (k.value != null || k.valor != null) && !k._synthetic);

  if (hasRealData) {
    return {
      kpis: list,
      contextual_insufficiency: false,
      contextual_integrity_score: 1,
      semantic_alignment_score: 0.95,
      governance_confidence: 0.9,
      explanation: null
    };
  }

  return {
    kpis: list,
    contextual_insufficiency: true,
    contextual_integrity_score: 0.4,
    semantic_alignment_score: 0.5,
    governance_confidence: 0.35,
    explanation: {
      code: 'CONTEXTUAL_DATA_INSUFFICIENT',
      message: 'Dados insuficientes para KPIs neste contexto operacional.',
      missing_dependencies: ctx.missing_dependencies || ['scoped_metrics', 'tenant_kpi_feed'],
      do_not_invent: true,
      corporate_aggregation_blocked: true
    }
  };
}

module.exports = { alignKpiResponse };
