'use strict';

function buildPeopleAnalyticsCenter(bindings = [], signalBundle = {}) {
  const b = bindings.find((x) => x.block_id === 'hr.people_analytics');
  const op = signalBundle.operational || {};
  return {
    center_id: 'hr_people_analytics',
    label: 'People Analytics',
    layer: 'operational',
    weight: 0.22,
    render_slot: 'kpi_cards',
    metrics: {
      active_headcount: b?.metrics?.active_headcount ?? op.active_headcount ?? 0,
      presence_compliance: b?.metrics?.presence_compliance ?? op.presence_compliance ?? 0,
      hr_alerts: b?.metrics?.hr_alerts ?? op.hr_alerts_open ?? 0
    },
    summary: b?.summary || 'Analytics de workforce',
    ok: true
  };
}

function buildTurnoverHeatmapCenter(bindings = [], signalBundle = {}) {
  const b = bindings.find((x) => x.block_id === 'hr.turnover_heatmap');
  const sectors = signalBundle.raw?.sector_breakdown || [];
  return {
    center_id: 'hr_turnover_heatmap',
    label: 'Turnover Heatmap',
    layer: 'operational',
    weight: 0.18,
    render_slot: 'grafico_tendencia',
    metrics: {
      turnover_risk: b?.metrics?.turnover_risk ?? signalBundle.operational?.turnover_risk_proxy ?? 0,
      hotspot_count: sectors.length
    },
    summary: b?.summary || 'Heatmap turnover',
    ok: true
  };
}

function buildAbsenteeismCenter(bindings = [], signalBundle = {}) {
  const b = bindings.find((x) => x.block_id === 'hr.absenteeism_monitor');
  const op = signalBundle.operational || {};
  return {
    center_id: 'hr_absenteeism_monitor',
    label: 'Monitor Absenteísmo',
    layer: 'operational',
    weight: 0.2,
    render_slot: 'alertas',
    metrics: {
      absence_index: b?.metrics?.absence_index ?? op.absence_index ?? 0,
      delay_index: b?.metrics?.delay_index ?? op.delay_index ?? 0
    },
    summary: b?.summary || 'Absenteísmo monitorado',
    ok: true
  };
}

function buildTrainingGovernanceCenter(bindings = []) {
  const b = bindings.find((x) => x.block_id === 'hr.training_governance');
  return {
    center_id: 'hr_training_governance',
    label: 'Governança Treinamentos',
    layer: 'governance',
    weight: 0.12,
    render_slot: 'insights_ia',
    metrics: b?.metrics || {},
    summary: b?.summary || 'Treinamentos',
    ok: true
  };
}

function buildPerformanceCenter(bindings = []) {
  const b = bindings.find((x) => x.block_id === 'hr.performance_distribution');
  return {
    center_id: 'hr_performance_distribution',
    label: 'Performance Humana',
    layer: 'management',
    weight: 0.1,
    render_slot: 'kpi_cards',
    metrics: b?.metrics || {},
    summary: b?.summary || 'Performance',
    ok: true
  };
}

function buildRecruitmentCenter(bindings = []) {
  const b = bindings.find((x) => x.block_id === 'hr.recruitment_pipeline');
  return {
    center_id: 'hr_recruitment_pipeline',
    label: 'Pipeline Recrutamento',
    layer: 'operational',
    weight: 0.1,
    render_slot: 'operacoes',
    metrics: b?.metrics || {},
    summary: b?.summary || 'Recrutamento',
    ok: true
  };
}

function buildRetentionCenter(bindings = [], signalBundle = {}) {
  const b = bindings.find((x) => x.block_id === 'hr.retention_risk');
  const op = signalBundle.operational || {};
  return {
    center_id: 'hr_retention_risk',
    label: 'Risco Retenção',
    layer: 'governance',
    weight: 0.14,
    render_slot: 'alertas',
    metrics: {
      retention_risk_score: b?.metrics?.retention_risk_score ?? op.retention_risk_score ?? 0
    },
    summary: b?.summary || 'Risco de retenção',
    ok: true
  };
}

function buildBehavioralCenter(bindings = []) {
  const b = bindings.find((x) => x.block_id === 'hr.behavioral_insights');
  return {
    center_id: 'hr_behavioral_insights',
    label: 'Insights Comportamentais',
    layer: 'operational',
    weight: 0.1,
    render_slot: 'insights_ia',
    metrics: b?.metrics || {},
    summary: b?.summary || 'Comportamento organizacional',
    ok: true
  };
}

function buildWorkforceHealthCenter(bindings = [], signalBundle = {}) {
  const b = bindings.find((x) => x.block_id === 'hr.workforce_health');
  const op = signalBundle.operational || {};
  return {
    center_id: 'hr_workforce_health',
    label: 'Saúde Organizacional',
    layer: 'operational',
    weight: 0.16,
    render_slot: 'grafico_tendencia',
    metrics: {
      pulse_evaluations: b?.metrics?.pulse_evaluations ?? op.pulse_evaluations ?? 0,
      organizational_health: b?.metrics?.organizational_health ?? 0
    },
    summary: b?.summary || 'Clima e saúde organizacional',
    ok: true
  };
}

function buildHrNarrativeCenter(bindings = [], engineContext = {}) {
  const b = bindings.find((x) => x.block_id === 'hr.hr_narrative');
  const paragraphs = b?.engine_output?.paragraphs || engineContext.narrative_paragraphs || [];
  return {
    center_id: 'hr_narrative',
    label: 'Narrativa RH',
    layer: 'strategic',
    weight: 0.06,
    render_slot: 'insights_ia',
    narrative: paragraphs.join('\n\n') || b?.summary,
    summary: paragraphs[0] || b?.summary || 'People governance',
    ok: paragraphs.length > 0
  };
}

const HR_QUESTIONS = Object.freeze([
  { id: 'q_turnover_sectors', text: 'Quais setores possuem maior turnover ou risco de saída?' },
  { id: 'q_retention_teams', text: 'Quais equipes apresentam risco de retenção elevado?' },
  { id: 'q_absenteeism', text: 'Onde há maior absenteísmo ou atrasos recorrentes?' },
  { id: 'q_training', text: 'Quais treinamentos estão vencidos ou pendentes?' },
  { id: 'q_overload', text: 'Quais áreas apresentam maior sobrecarga (horas extras / fadiga)?' },
  { id: 'q_knowledge', text: 'Existe risco de perda de conhecimento crítico?' },
  { id: 'q_behavior', text: 'Qual perfil ou área apresenta maior risco comportamental?' },
  { id: 'q_capacitation', text: 'Onde há gaps de capacitação prioritários?' }
]);

function buildHrDecisionSupport(bindings = [], engineContext = {}) {
  const ai = bindings.find((x) => x.block_id === 'hr.contextual_hr_ai');
  return {
    center_id: 'hr_decision_support',
    label: 'IA Contextual RH',
    layer: 'operational',
    weight: 0.08,
    render_slot: 'pergunte_ia',
    questions: HR_QUESTIONS,
    findings: ai?.engine_output?.findings || engineContext.findings || [],
    denied_topics: ['uptime', 'oee', 'producao', 'ebitda', 'apr', 'loto', 'incidente_sst'],
    summary: ai?.summary || 'Assistente people-centric',
    ok: true
  };
}

module.exports = {
  buildPeopleAnalyticsCenter,
  buildTurnoverHeatmapCenter,
  buildAbsenteeismCenter,
  buildTrainingGovernanceCenter,
  buildPerformanceCenter,
  buildRecruitmentCenter,
  buildRetentionCenter,
  buildBehavioralCenter,
  buildWorkforceHealthCenter,
  buildHrNarrativeCenter,
  buildHrDecisionSupport,
  HR_QUESTIONS
};
