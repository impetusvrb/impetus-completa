'use strict';

const { HR_BLOCK_ALIASES } = require('../../../registry/hrCognitiveBlockPack');

const BINDERS = {
  'hr.people_analytics': bindPeopleAnalytics,
  'hr.turnover_heatmap': bindTurnoverHeatmap,
  'hr.absenteeism_monitor': bindAbsenteeism,
  'hr.training_governance': bindTraining,
  'hr.performance_distribution': bindPerformance,
  'hr.recruitment_pipeline': bindRecruitment,
  'hr.retention_risk': bindRetention,
  'hr.behavioral_insights': bindBehavioral,
  'hr.workforce_health': bindWorkforceHealth,
  'hr.hr_narrative': bindHrNarrative,
  'hr.contextual_hr_ai': bindHrAi
};

function invokeHrBlockBridge(blockId, signalBundle = {}, ctx = {}) {
  const canonical = HR_BLOCK_ALIASES[blockId] || blockId;
  const fn = BINDERS[canonical] || BINDERS[blockId];
  if (!fn) {
    return { ok: false, block_id: blockId, bridge_status: 'unbound_z26', reason: 'unknown_block' };
  }
  const out = fn(signalBundle, ctx);
  return { ...out, block_id: canonical, bridge_status: out.ok ? 'bound_z26' : 'bound_empty' };
}

function buildHrEngineContext(signalBundle = {}, bindings = []) {
  const op = signalBundle.operational || {};
  const paragraphs = [];
  if (op.absence_index > 5) {
    paragraphs.push(`Absenteísmo em ${op.absence_index}% — requer atenção de gestão de pessoas.`);
  }
  if (op.retention_risk_score >= 40) {
    paragraphs.push(`Risco de retenção elevado (score ${op.retention_risk_score}).`);
  }
  if (op.pulse_evaluations > 0) {
    paragraphs.push(`${op.pulse_evaluations} avaliações de clima/pulse registadas.`);
  }
  return {
    summary: { headcount: op.active_headcount, absence_index: op.absence_index },
    narrative_paragraphs: paragraphs,
    findings: bindings.filter((b) => b.ok).map((b) => b.summary).filter(Boolean)
  };
}

function bindPeopleAnalytics(signals) {
  const op = signals.operational || {};
  return {
    ok: signals.ok === true,
    metrics: {
      active_headcount: op.active_headcount ?? 0,
      presence_compliance: op.presence_compliance ?? 0,
      hr_alerts: op.hr_alerts_open ?? 0
    },
    summary: `Headcount activo: ${op.active_headcount ?? 0}; compliance presença ${op.presence_compliance ?? 0}%`,
    engine_ref: 'hr.workforce_metrics'
  };
}

function bindTurnoverHeatmap(signals) {
  const sectors = signals.raw?.sector_breakdown || [];
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: {
      turnover_risk: op.turnover_risk_proxy ?? 0,
      hotspots: sectors.length,
      top_sector: sectors[0]?.sector || null
    },
    summary: sectors.length ? `Turnover hotspots: ${sectors.map((s) => s.sector).join(', ')}` : 'Turnover estável',
    engine_ref: 'hr.turnover_series'
  };
}

function bindAbsenteeism(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: {
      absence_index: op.absence_index ?? 0,
      delay_index: op.delay_index ?? 0,
      fatigue_risk: op.fatigue_risk ?? 0
    },
    summary: `Absenteísmo ${op.absence_index ?? 0}% · atrasos ${op.delay_index ?? 0}%`,
    engine_ref: 'hr.absence_index'
  };
}

function bindTraining(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: {
      training_overdue: op.training_overdue_proxy ?? 0,
      compliance_training: op.training_overdue_proxy === 0 ? 100 : Math.max(50, 100 - op.training_overdue_proxy * 5)
    },
    summary: `${op.training_overdue_proxy ?? 0} treinamentos requerem atenção`,
    engine_ref: 'hr.training_compliance'
  };
}

function bindPerformance(signals) {
  const op = signals.operational || {};
  return {
    ok: op.active_headcount > 0,
    metrics: {
      performance_coverage: op.presence_compliance ?? 0,
      teams_monitored: signals.raw?.sector_breakdown?.length ?? 0
    },
    summary: 'Distribuição de performance humana monitorada',
    engine_ref: 'hr.performance_metrics'
  };
}

function bindRecruitment(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: { open_positions: op.open_positions_proxy ?? 0, pipeline_active: (op.open_positions_proxy ?? 0) > 0 },
    summary: `${op.open_positions_proxy ?? 0} vagas/oportunidades em pipeline`,
    engine_ref: 'hr.open_positions'
  };
}

function bindRetention(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: {
      retention_risk_score: op.retention_risk_score ?? 0,
      turnover_risk: op.turnover_risk_proxy ?? 0
    },
    summary: `Risco retenção: ${op.retention_risk_score ?? 0}/100`,
    engine_ref: 'hr.retention_risk'
  };
}

function bindBehavioral(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: {
      fatigue_risk: op.fatigue_risk ?? 0,
      behavioral_alerts: op.hr_alerts_open ?? 0
    },
    summary: 'Insights comportamentais e carga organizacional',
    engine_ref: 'hr.behavior_analytics'
  };
}

function bindWorkforceHealth(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: {
      pulse_evaluations: op.pulse_evaluations ?? 0,
      organizational_health: Math.max(0, 100 - (op.retention_risk_score ?? 0) / 2),
      climate_stable: (op.absence_index ?? 0) < 5
    },
    summary: `Saúde organizacional · pulse ${op.pulse_evaluations ?? 0} ciclos`,
    engine_ref: 'hr.pulse_climate'
  };
}

function bindHrNarrative(signals, ctx) {
  const engineContext = ctx._engine_context || buildHrEngineContext(signals, []);
  const text = (engineContext.narrative_paragraphs || []).join('\n\n');
  return {
    ok: text.length > 0 || signals.ok,
    metrics: { paragraph_count: engineContext.narrative_paragraphs?.length ?? 0 },
    engine_output: { paragraphs: engineContext.narrative_paragraphs },
    summary: text || 'Resumo people-centric RH',
    engine_ref: 'hr.executive_narrative'
  };
}

function bindHrAi(signals, ctx) {
  const engineContext = ctx._engine_context || buildHrEngineContext(signals, []);
  return {
    ok: true,
    metrics: { contextual_ready: true },
    engine_output: { findings: engineContext.findings },
    summary: 'IA contextual people-centric',
    engine_ref: 'hr.contextual_ai'
  };
}

module.exports = { invokeHrBlockBridge, buildHrEngineContext, BINDERS };
