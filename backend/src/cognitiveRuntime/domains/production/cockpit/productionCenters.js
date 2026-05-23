'use strict';

function buildOeeCenter(bindings = [], signalBundle = {}) {
  const b = bindings.find((x) => x.block_id === 'production.oee_contextual');
  const ctx = signalBundle.oee_context || {};
  return {
    center_id: 'production_oee_contextual',
    label: 'OEE Contextual',
    layer: 'operational',
    weight: 0.22,
    render_slot: 'kpi_cards',
    metrics: b?.metrics || { oee_contextual: ctx.weighted_oee, stability: ctx.stability_index },
    summary: b?.summary || 'OEE contextualizado',
    ok: true
  };
}

function buildThroughputCenter(bindings = [], signalBundle = {}) {
  const b = bindings.find((x) => x.block_id === 'production.throughput_monitor');
  const op = signalBundle.operational || {};
  return {
    center_id: 'production_throughput',
    label: 'Throughput',
    layer: 'operational',
    weight: 0.18,
    render_slot: 'grafico_tendencia',
    metrics: b?.metrics || { throughput: op.throughput, target: op.target_qty },
    summary: b?.summary || 'Throughput turno',
    ok: true
  };
}

function buildBottleneckCenter(bindings = [], signalBundle = {}) {
  const b = bindings.find((x) => x.block_id === 'production.bottleneck_heatmap');
  return {
    center_id: 'production_bottleneck',
    label: 'Gargalos',
    layer: 'operational',
    weight: 0.2,
    render_slot: 'grafico_tendencia',
    metrics: b?.metrics || { primary_line: signalBundle.bottlenecks?.primary_line },
    summary: b?.summary || 'Heatmap gargalos',
    ok: true
  };
}

function buildDowntimeCenter(bindings = [], signalBundle = {}) {
  const b = bindings.find((x) => x.block_id === 'production.downtime_analysis');
  return {
    center_id: 'production_downtime',
    label: 'Paradas / Downtime',
    layer: 'operational',
    weight: 0.16,
    render_slot: 'alertas',
    metrics: b?.metrics || {},
    summary: b?.summary || 'Análise paradas',
    ok: true
  };
}

function buildTelemetryCenter(bindings = []) {
  const b = bindings.find((x) => x.block_id === 'production.telemetry_center');
  return {
    center_id: 'production_telemetry',
    label: 'Telemetria Industrial',
    layer: 'operational',
    weight: 0.14,
    render_slot: 'insights_ia',
    metrics: b?.metrics || {},
    summary: b?.summary || 'Centro telemetria',
    ok: true
  };
}

function buildScrapCenter(bindings = []) {
  const b = bindings.find((x) => x.block_id === 'production.scrap_intelligence');
  return {
    center_id: 'production_scrap',
    label: 'Scrap / Perdas',
    layer: 'operational',
    weight: 0.12,
    render_slot: 'alertas',
    metrics: b?.metrics || {},
    summary: b?.summary || 'Inteligência perdas',
    ok: true
  };
}

function buildOperationalAiCenter(bindings = [], engineContext = {}) {
  const b = bindings.find((x) => x.block_id === 'production.operational_ai');
  return {
    center_id: 'production_operational_ai',
    label: 'IA Operacional',
    layer: 'governance',
    weight: 0.1,
    render_slot: 'insights_ia',
    metrics: { answers: engineContext.ai?.answers?.length ?? 0 },
    summary: b?.summary || 'IA contextual industrial',
    ok: true
  };
}

function buildProductionNarrativeCenter(bindings = [], engineContext = {}) {
  const b = bindings.find((x) => x.block_id === 'production.production_narrative');
  return {
    center_id: 'production_narrative',
    label: 'Narrativa Produção',
    layer: 'strategic',
    weight: 0.08,
    render_slot: 'insights_ia',
    metrics: {},
    summary: engineContext.narrative?.paragraphs?.[0] || b?.summary || 'Resumo operacional',
    ok: true
  };
}

function buildProductionDecisionSupport(bindings = [], engineContext = {}) {
  const ai = engineContext.ai || {};
  return {
    center_id: 'production_decision_support',
    label: 'Suporte Decisão Produção',
    layer: 'governance',
    weight: 0.1,
    render_slot: 'insights_ia',
    contextual_questions: ai.contextual_questions || [],
    metrics: {},
    summary: 'Perguntas operacionais industriais',
    ok: true
  };
}

module.exports = {
  buildOeeCenter,
  buildThroughputCenter,
  buildBottleneckCenter,
  buildDowntimeCenter,
  buildTelemetryCenter,
  buildScrapCenter,
  buildOperationalAiCenter,
  buildProductionNarrativeCenter,
  buildProductionDecisionSupport
};
