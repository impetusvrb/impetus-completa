'use strict';

function buildCenter(centerId, label, layer, renderSlot, metrics, summary, weight = 0.12) {
  return {
    center_id: centerId,
    label,
    layer,
    render_slot: renderSlot,
    weight,
    metrics: (metrics || []).slice(0, 8),
    summary: summary || '',
    domain: 'maintenance'
  };
}

function buildReliabilityCenter(ctx) {
  const r = ctx.reliability || {};
  return buildCenter(
    'maintenance_reliability',
    'Centro Confiabilidade',
    'governance',
    'kpi_cards',
    [
      { key: 'mtbf_hours', value: r.mtbf_hours },
      { key: 'mttr_hours', value: r.mttr_hours },
      { key: 'availability_pct', value: r.availability_pct },
      { key: 'downtime_minutes', value: r.downtime_minutes }
    ].filter((m) => m.value != null),
    r.availability_pct != null ? `Disponibilidade ${r.availability_pct}%` : 'Confiabilidade aguardando dados',
    0.18
  );
}

function buildAssetHealthCenter(ctx) {
  const h = ctx.health || {};
  return buildCenter(
    'maintenance_asset_health',
    'Saúde Ativos',
    'operational',
    'kpi_cards',
    [
      { key: 'asset_health_score', value: h.asset_health_score },
      { key: 'critical_assets', value: h.critical_assets },
      { key: 'maintenance_open', value: h.maintenance_open }
    ].filter((m) => m.value != null),
    h.asset_health_score != null ? `Saúde ${h.asset_health_score}` : 'Saúde ativos indisponível',
    0.16
  );
}

function buildPredictiveCenter(ctx) {
  const p = ctx.predictive || {};
  return buildCenter(
    'maintenance_predictive',
    'Risco Falha Supervisionado',
    'governance',
    'alertas',
    [{ key: 'failure_risk', value: p.failure_risk }],
    p.recommendation || `Risco ${p.failure_risk}`,
    0.14
  );
}

function buildDegradationCenter(ctx) {
  const d = ctx.degradation || {};
  return buildCenter(
    'maintenance_degradation',
    'Degradação',
    'operational',
    'trend',
    [
      { key: 'trend', value: d.trend },
      { key: 'signal_count', value: d.signal_count }
    ],
    d.degradation_detected ? `Degradação · ${d.trend}` : 'Sem degradação',
    0.12
  );
}

function buildDowntimeCenter(ctx) {
  const d = ctx.downtime || {};
  return buildCenter(
    'maintenance_downtime',
    'Downtime',
    'operational',
    'trend',
    [{ key: 'downtime_minutes', value: d.maintenance_downtime_minutes }],
    `Downtime ${d.maintenance_downtime_minutes ?? 0} min`,
    0.12
  );
}

function buildTelemetryCenter(ctx) {
  const t = ctx.telemetry || {};
  return buildCenter(
    'maintenance_telemetry',
    'Telemetria Confiabilidade',
    'operational',
    'telemetry',
    [{ key: 'readiness', value: t.readiness }],
    `Telemetria ${t.readiness}`,
    0.1
  );
}

function buildMaintenanceAiCenter(ctx) {
  const ai = ctx.ai || {};
  return buildCenter(
    'maintenance_ai',
    'IA Manutenção',
    'governance',
    'assistente_ia',
    [{ key: 'questions', value: ai.questions?.length ?? 0 }],
    (ai.questions || [])[0]?.q || 'IA contextual manutenção',
    0.1
  );
}

function buildMaintenanceNarrativeCenter(ctx) {
  const n = ctx.narrative || {};
  return buildCenter(
    'maintenance_narrative',
    'Narrativa Confiabilidade',
    'strategic',
    'narrative',
    [],
    n.narrative,
    0.08
  );
}

function buildMaintenanceDecisionSupport(bindings, ctx) {
  return {
    center_id: 'maintenance_decision_support',
    label: 'Suporte Decisão',
    layer: 'governance',
    render_slot: 'decision_support',
    weight: 0.1,
    metrics: [],
    summary: 'Recomendações supervisionadas — sem auto-manutenção',
    recommendations: (ctx.predictive?.recommendation ? [ctx.predictive.recommendation] : []).slice(0, 3),
    auto_action: false,
    domain: 'maintenance'
  };
}

module.exports = {
  buildReliabilityCenter,
  buildAssetHealthCenter,
  buildPredictiveCenter,
  buildDegradationCenter,
  buildDowntimeCenter,
  buildTelemetryCenter,
  buildMaintenanceAiCenter,
  buildMaintenanceNarrativeCenter,
  buildMaintenanceDecisionSupport
};
