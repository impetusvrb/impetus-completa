'use strict';

function buildBoardroomCenters(aggregation = {}, strategic = {}, health = {}, narrative = {}, ai = {}) {
  const ent = aggregation.enterprise?.enterprise || {};
  return [
    {
      center_id: 'executive_enterprise_health',
      label: 'Saúde Enterprise',
      layer: 'strategic',
      render_slot: 'kpi_cards',
      weight: 0.22,
      metrics: { health_index: ent.health_index, risk_index: ent.risk_index, maturity: strategic.maturity }
    },
    {
      center_id: 'executive_cross_domain',
      label: 'Convergência Multi-Domínio',
      layer: 'strategic',
      render_slot: 'kpi_cards',
      weight: 0.2,
      metrics: { convergence: strategic.convergence, alignment: strategic.convergence >= 0.7 ? 'aligned' : 'watch' }
    },
    {
      center_id: 'executive_strategic_oee',
      label: 'OEE Estratégico',
      layer: 'strategic',
      render_slot: 'grafico_tendencia',
      weight: 0.18,
      metrics: { strategic_oee: strategic.strategic_oee_trend, trend: strategic.production_stability }
    },
    {
      center_id: 'executive_enterprise_risk',
      label: 'Risco Enterprise',
      layer: 'strategic',
      render_slot: 'alertas',
      weight: 0.16,
      metrics: { risk_index: ent.risk_index, environmental: strategic.environmental_risk, safety: strategic.safety_governance }
    },
    {
      center_id: 'executive_boardroom_summary',
      label: 'Boardroom Summary',
      layer: 'strategic',
      render_slot: 'resumo_inteligente',
      weight: 0.14,
      summary: narrative.paragraphs?.join(' ') || 'Síntese enterprise indisponível.'
    },
    {
      center_id: 'executive_strategic_ai',
      label: 'IA Estratégica',
      layer: 'strategic',
      render_slot: 'assistente_ia',
      weight: 0.1,
      metrics: { questions: ai.contextual_questions?.length ?? 0 }
    }
  ];
}

module.exports = { buildBoardroomCenters };
