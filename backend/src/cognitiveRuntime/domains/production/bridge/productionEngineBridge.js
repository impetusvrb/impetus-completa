'use strict';

const { PRODUCTION_BLOCK_ALIASES } = require('../../../registry/productionCognitiveBlockPack');
const { buildProductionOperationalAI } = require('./productionOperationalAI');
const { buildProductionNarrative } = require('./productionNarrativeEngine');
const { resolveIndustrialSensors } = require('../telemetry/industrialSensorRuntime');
const { correlateProductionDomains } = require('../telemetry/telemetryCorrelationRuntime');

const BINDERS = {
  'production.oee_contextual': bindOee,
  'production.line_efficiency': bindLineEfficiency,
  'production.throughput_monitor': bindThroughput,
  'production.downtime_analysis': bindDowntime,
  'production.scrap_intelligence': bindScrap,
  'production.bottleneck_heatmap': bindBottleneck,
  'production.process_stability': bindStability,
  'production.machine_health': bindMachineHealth,
  'production.telemetry_center': bindTelemetry,
  'production.energy_efficiency': bindEnergy,
  'production.shift_performance': bindShift,
  'production.predictive_anomalies': bindAnomalies,
  'production.operational_ai': bindOperationalAi,
  'production.production_narrative': bindNarrative,
  'production.maintenance_correlation': bindMaintenanceCorr,
  'production.quality_correlation': bindQualityCorr
};

function invokeProductionBlockBridge(blockId, signalBundle = {}, ctx = {}) {
  const canonical = PRODUCTION_BLOCK_ALIASES[blockId] || blockId;
  const fn = BINDERS[canonical] || BINDERS[blockId];
  if (!fn) {
    return { ok: false, block_id: blockId, bridge_status: 'unbound_zp0', reason: 'unknown_block' };
  }
  const out = fn(signalBundle, ctx);
  return { ...out, block_id: canonical, bridge_status: out.ok ? 'bound_zp0' : 'bound_empty' };
}

function buildProductionEngineContext(signalBundle = {}, bindings = []) {
  const ai = buildProductionOperationalAI(signalBundle, bindings);
  const narrative = buildProductionNarrative(signalBundle, { findings: bindings.map((b) => b.summary).filter(Boolean) });
  return { ai, narrative, correlations: correlateProductionDomains(signalBundle) };
}

function bindOee(signals) {
  const ctx = signals.oee_context || {};
  const op = signals.operational || {};
  return {
    ok: signals.ok === true && ctx.weighted_oee != null,
    metrics: { oee_contextual: ctx.weighted_oee, stability: ctx.stability_index, lines: ctx.line_contexts?.length ?? 0 },
    summary: ctx.weighted_oee != null ? `OEE contextual ${ctx.weighted_oee}% · ${ctx.line_contexts?.length || 0} linhas` : 'OEE aguardando dados de turno',
    engine_ref: 'production.oee_context_engine'
  };
}

function bindLineEfficiency(signals) {
  const lines = signals.raw?.lines || [];
  return {
    ok: lines.length > 0,
    metrics: { line_count: lines.length, avg_efficiency: signals.operational?.efficiency_pct },
    summary: lines.length ? `${lines.length} linhas monitoradas no turno` : 'Sem linhas',
    engine_ref: 'production.line_efficiency'
  };
}

function bindThroughput(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: { throughput: op.throughput ?? 0, target: op.target_qty ?? 0 },
    summary: `Throughput ${op.throughput ?? 0} / meta ${op.target_qty ?? 0}`,
    engine_ref: 'production.throughput'
  };
}

function bindDowntime(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: { downtime_proxy: op.downtime_proxy ?? 0, maintenance_open: op.maintenance_open ?? 0 },
    summary: `Paradas proxy: ${op.downtime_proxy ?? 0} · OS abertas ${op.maintenance_open ?? 0}`,
    engine_ref: 'production.downtime'
  };
}

function bindScrap(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: { scrap_qty: op.scrap_qty ?? 0 },
    summary: `Scrap/perdas turno: ${op.scrap_qty ?? 0}`,
    engine_ref: 'production.scrap'
  };
}

function bindBottleneck(signals) {
  const bn = signals.bottlenecks || {};
  return {
    ok: true,
    metrics: { primary_line: bn.primary_line, score: bn.top_score, heatmap_size: bn.heatmap?.length ?? 0 },
    summary: bn.primary_line ? `Gargalo: linha ${bn.primary_line}` : 'Sem gargalo identificado',
    engine_ref: 'production.bottleneck'
  };
}

function bindStability(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: { stability_index: op.stability_index ?? 0 },
    summary: `Estabilidade processo: índice ${op.stability_index ?? 0}`,
    engine_ref: 'production.stability'
  };
}

function bindMachineHealth(signals) {
  const sensors = resolveIndustrialSensors(signals.raw || {});
  return {
    ok: true,
    metrics: sensors,
    summary: sensors.empty_state ? 'Sensores: estado vazio técnico' : `${sensors.sensor_points_active} pontos monitorados`,
    engine_ref: 'production.machine_health'
  };
}

function bindTelemetry(signals) {
  const t = signals.telemetry || {};
  return {
    ok: signals.telemetry_readiness !== 'error',
    metrics: { readiness: signals.telemetry_readiness, integrity: t.telemetry_integrity },
    summary: `Telemetria ${signals.telemetry_readiness || 'empty'}`,
    engine_ref: 'production.telemetry_bridge'
  };
}

function bindEnergy() {
  return { ok: false, metrics: {}, summary: 'Energia: sem feed dedicado — estado vazio', engine_ref: 'production.energy' };
}

function bindShift(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: { lines_active: op.lines_active ?? 0, efficiency: op.efficiency_pct },
    summary: `Turno: ${op.lines_active ?? 0} linhas · eficiência ${op.efficiency_pct ?? '—'}%`,
    engine_ref: 'production.shift'
  };
}

function bindAnomalies(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: { risk: op.anomaly_risk ?? 'normal' },
    summary: `Risco anomalia: ${op.anomaly_risk ?? 'normal'}`,
    engine_ref: 'production.anomaly'
  };
}

function bindOperationalAi(signals) {
  const ai = buildProductionOperationalAI(signals, []);
  return { ok: true, metrics: { answers: ai.answers.length }, summary: ai.answers[0]?.a || 'IA operacional produção', engine_ref: 'production.operational_ai', ai };
}

function bindNarrative(signals) {
  const n = buildProductionNarrative(signals);
  return { ok: true, metrics: { paragraphs: n.paragraphs.length }, summary: n.paragraphs[0] || 'Narrativa produção', engine_ref: 'production.narrative', narrative: n };
}

function bindMaintenanceCorr(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: { open_orders: op.maintenance_open ?? 0 },
    summary: `Correlação manutenção (interna): ${op.maintenance_open ?? 0} OS`,
    engine_ref: 'production.maintenance_corr',
    cross_domain_visible: false
  };
}

function bindQualityCorr(signals) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: { nc_open: op.quality_nc_open ?? 0, scrap: op.scrap_qty ?? 0 },
    summary: `Correlação qualidade (interna): ${op.quality_nc_open ?? 0} NC abertas`,
    engine_ref: 'production.quality_corr',
    cross_domain_visible: false
  };
}

module.exports = {
  invokeProductionBlockBridge,
  buildProductionEngineContext,
  buildProductionOperationalAI,
  buildProductionNarrative
};
