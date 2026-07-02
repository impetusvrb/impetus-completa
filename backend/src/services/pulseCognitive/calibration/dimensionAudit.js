/**
 * CERT-PULSE-04 FASE 1 — Auditoria das nove dimensões cognitivas.
 * Documentação estática; não altera pesos nem algoritmos.
 */
'use strict';

const { DIMENSIONS } = require('../constants');

const DIMENSION_SPEC = {
  engagement: {
    sources: ['tpm_incidents', 'proacao_proposals', 'intelligent_registrations', 'tasks_completed'],
    modules: ['tpm', 'proacao', 'registro_inteligente', 'dashboard'],
    formula_summary:
      'scaleActivity(opVolume) × 0.6 + scaleActivity(tasks) × 0.4; opVolume = TPM + Pró-Ação + Registro Inteligente',
    expected_range: [28, 95],
    sensitivity: 'alta — responde rapidamente a volume operacional',
    technical_rationale:
      'Engajamento operacional mede participação em rotinas industriais (TPM, melhorias, registros).'
  },
  participation: {
    sources: ['communications_read', 'tasks_completed'],
    modules: ['comunicacao', 'dashboard'],
    formula_summary: 'scaleActivity(comms) × 0.45 + scaleActivity(tasks) × 0.55',
    expected_range: [28, 95],
    sensitivity: 'média-alta',
    technical_rationale: 'Participação em comunicações internas e conclusão de tarefas.'
  },
  development: {
    sources: ['proacao_proposals'],
    modules: ['proacao'],
    formula_summary: 'scaleActivity(proacao, [0,1,2,4,7])',
    expected_range: [28, 95],
    sensitivity: 'média',
    technical_rationale: 'Propostas de melhoria (Pró-Ação) como proxy de desenvolvimento contínuo.'
  },
  collaboration: {
    sources: ['synergy_self_eval', 'tpm_incidents', 'proacao_proposals', 'intelligent_registrations'],
    modules: ['pulse', 'tpm', 'proacao', 'registro_inteligente'],
    formula_summary: 'synergy × 20 se autoavaliação; senão scaleActivity(opVolume) × 0.85',
    expected_range: [28, 95],
    sensitivity: 'média — depende de autoavaliação Pulse quando disponível',
    technical_rationale: 'Sinergia percebida ou volume colaborativo operacional.'
  },
  learning: {
    sources: ['proacao_proposals', 'intelligent_registrations'],
    modules: ['proacao', 'registro_inteligente', 'treinamento'],
    formula_summary: 'development × 0.7 + scaleActivity(intel) × 0.3',
    expected_range: [28, 95],
    sensitivity: 'média',
    technical_rationale: 'Aprendizado via melhorias e registros reflexivos.'
  },
  stability: {
    sources: ['absence_rate', 'delay_rate', 'overtime_minutes', 'time_clock_records'],
    modules: ['rh', 'ponto'],
    formula_summary:
      'inverseRate(absence) × 0.55 + inverseRate(delay) × 0.25 + overtime_bucket × 0.2; default 62 sem ponto',
    expected_range: [15, 95],
    sensitivity: 'alta quando dados de ponto disponíveis',
    technical_rationale: 'Estabilidade de jornada: absenteísmo, atrasos e horas extras.'
  },
  integration: {
    sources: ['tenure_days'],
    modules: ['rh', 'plataforma'],
    formula_summary: 'Buckets por tenure: >3a=88, >1a=78, >90d=65, else=48',
    expected_range: [48, 88],
    sensitivity: 'baixa — muda lentamente',
    technical_rationale: 'Tempo de casa como proxy de integração organizacional.'
  },
  consistency: {
    sources: ['previous_engagement', 'current_engagement'],
    modules: ['pulse_cognitive_history'],
    formula_summary: '100 - |engagement - prevEngagement| × 1.2; default 58 sem histórico',
    expected_range: [15, 100],
    sensitivity: 'média — requer recálculo anterior',
    technical_rationale: 'Consistência temporal do engajamento entre ciclos.'
  },
  evolution: {
    sources: ['previous_dimensions', 'current_dimensions'],
    modules: ['pulse_cognitive_history'],
    formula_summary:
      'Com histórico: 50 + (curAvg - prevAvg) × 2.5; sem histórico: engagement×0.4 + participation×0.3 + development×0.3',
    expected_range: [15, 100],
    sensitivity: 'média-alta com histórico',
    technical_rationale: 'Evolução comparativa entre snapshots dimensionais.'
  }
};

const SIGNAL_CHAIN = [
  {
    signal: 'tpm_incidents',
    weight_in_index: 0.15,
    primary_dimension: 'engagement',
    contribution: 'Volume TPM alimenta engagement (60% do componente opVolume)',
    impact: 'alto em equipes com TPM frequente',
    confidence: 0.72,
    module: 'tpm'
  },
  {
    signal: 'proacao_proposals',
    weight_in_index: 0.25,
    primary_dimension: 'development',
    contribution: 'Desenvolvimento direto + parte de engagement/learning',
    impact: 'alto em cultura de melhoria',
    confidence: 0.7,
    module: 'proacao'
  },
  {
    signal: 'intelligent_registrations',
    weight_in_index: 0.14,
    primary_dimension: 'learning',
    contribution: 'Learning (30%) + engagement via opVolume',
    impact: 'médio',
    confidence: 0.65,
    module: 'registro_inteligente'
  },
  {
    signal: 'tasks_completed',
    weight_in_index: 0.127,
    primary_dimension: 'participation',
    contribution: 'Participação (55%) + engagement (40%)',
    impact: 'médio',
    confidence: 0.68,
    module: 'dashboard'
  },
  {
    signal: 'communications_read',
    weight_in_index: 0.054,
    primary_dimension: 'participation',
    contribution: 'Participação (45%)',
    impact: 'baixo-médio',
    confidence: 0.6,
    module: 'comunicacao'
  },
  {
    signal: 'absence_rate',
    weight_in_index: 0.15,
    primary_dimension: 'stability',
    contribution: 'Estabilidade (55% do componente ponto)',
    impact: 'alto com dados de ponto',
    confidence: 0.75,
    module: 'rh'
  },
  {
    signal: 'overtime_minutes',
    weight_in_index: 0.03,
    primary_dimension: 'stability',
    contribution: 'Estabilidade (20% overtime bucket)',
    impact: 'médio em sobrecarga',
    confidence: 0.62,
    module: 'rh'
  },
  {
    signal: 'tenure_days',
    weight_in_index: 0.1,
    primary_dimension: 'integration',
    contribution: 'Integração integral',
    impact: 'lento, estrutural',
    confidence: 0.8,
    module: 'rh'
  },
  {
    signal: 'pulse_self_evaluation',
    weight_in_index: 0.1,
    primary_dimension: 'collaboration',
    contribution: 'Synergy e dimensões inferidas em correlação',
    impact: 'alto quando campanha Pulse ativa',
    confidence: 0.78,
    module: 'pulse'
  }
];

function buildDimensionAuditMatrix() {
  const dimensions = DIMENSIONS.map((d) => {
    const spec = DIMENSION_SPEC[d.key] || {};
    return {
      key: d.key,
      label: d.label,
      weight: d.weight,
      weight_percent: Math.round(d.weight * 1000) / 10,
      impact_on_index: `${(d.weight * 100).toFixed(1)}% do Pulse Index final`,
      ...spec
    };
  });

  const signal_matrix = SIGNAL_CHAIN.map((s) => ({
    ...s,
    chain: `${s.signal} → peso dimensão ~${s.weight_in_index} → ${s.contribution} → impacto ${s.impact}`
  }));

  const weight_sum = DIMENSIONS.reduce((s, d) => s + d.weight, 0);

  return {
    ok: true,
    framework: 'pulse_dimension_audit',
    cert: 'CERT-PULSE-04',
    dimensions,
    signal_matrix,
    weight_sum: Math.round(weight_sum * 1000) / 1000,
    weights_frozen: true,
    note: 'Pesos documentados para calibração; alteração automática desabilitada por governança.',
    governance: { assistive_only: true, human_in_the_loop: true }
  };
}

module.exports = { buildDimensionAuditMatrix, DIMENSION_SPEC, SIGNAL_CHAIN };
