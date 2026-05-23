'use strict';

const { MAINTENANCE_BLOCK_ALIASES } = require('../../../registry/maintenanceCognitiveBlockPack');
const {
  runMaintenanceTelemetryRuntime,
  runMachineHealthRuntime,
  runDegradationSignalAnalyzer,
  runTelemetryReliabilityRuntime,
  runMachineStabilityRuntime
} = require('../telemetry/maintenanceTelemetryRuntime');
const {
  runReliabilityIntelligenceRuntime,
  runMtbfMttrAnalyzer,
  runDowntimeCorrelationEngine,
  runAssetCriticalityRuntime,
  runMaintenanceRiskGovernance
} = require('../reliability/reliabilityIntelligenceRuntime');
const {
  runPredictiveMaintenanceRuntime,
  runDegradationTrendRuntime,
  runPredictiveFailureAdvisor,
  runMaintenancePredictionGovernance
} = require('../predictive/predictiveMaintenanceRuntime');
const {
  runMaintenanceOperationalAi,
  runMaintenanceNarrativeEngine
} = require('../ai/maintenanceOperationalAi');
const { runMaintenanceNativeKpiAdapter } = require('../kpi/maintenanceNativeKpiAdapter');
const { runMaintenanceCrossDomainCorrelation } = require('../governance/maintenanceIsolationRuntime');

const BINDERS = {
  'maintenance.asset_health': bindAssetHealth,
  'maintenance.mtbf_mttr': bindMtbfMttr,
  'maintenance.predictive_failure': bindPredictive,
  'maintenance.machine_stability': bindStability,
  'maintenance.preventive_schedule': bindPreventive,
  'maintenance.breakdown_heatmap': bindHeatmap,
  'maintenance.parts_risk': bindParts,
  'maintenance.downtime_correlation': bindDowntime,
  'maintenance.reliability_center': bindReliability,
  'maintenance.failure_patterns': bindPatterns,
  'maintenance.machine_degradation': bindDegradation,
  'maintenance.maintenance_ai': bindAi,
  'maintenance.maintenance_narrative': bindNarrative,
  'maintenance.predictive_alerts': bindAlerts,
  'maintenance.maintenance_governance': bindGovernance,
  'maintenance.maintenance_usefulness': bindUsefulness,
  'maintenance.asset_criticality': bindCriticality,
  'maintenance.telemetry_reliability': bindTelemetry
};

function invokeMaintenanceBlockBridge(blockId, signalBundle = {}, ctx = {}) {
  const canonical = MAINTENANCE_BLOCK_ALIASES[blockId] || blockId;
  const fn = BINDERS[canonical] || BINDERS[blockId];
  if (!fn) return { ok: false, block_id: blockId, bridge_status: 'unbound_zm1', reason: 'unknown_block' };
  const out = fn(signalBundle, ctx);
  return { ...out, block_id: canonical, bridge_status: out.ok ? 'bound_zm1' : 'bound_empty' };
}

function buildMaintenanceEngineContext(signalBundle = {}, bindings = [], ctx = {}) {
  const telemetry = runMaintenanceTelemetryRuntime(signalBundle);
  const health = runMachineHealthRuntime(signalBundle);
  const degradation = runDegradationSignalAnalyzer(signalBundle);
  const stability = runMachineStabilityRuntime(signalBundle);
  const reliability = runReliabilityIntelligenceRuntime(signalBundle);
  const mtbf = runMtbfMttrAnalyzer(signalBundle);
  const cross = runMaintenanceCrossDomainCorrelation(signalBundle, ctx);
  const downtime = runDowntimeCorrelationEngine(signalBundle, cross);
  const criticality = runAssetCriticalityRuntime(signalBundle);
  const predictive = runPredictiveMaintenanceRuntime(signalBundle, degradation);
  const degradationTrend = runDegradationTrendRuntime(degradation);
  const predictionGov = runMaintenancePredictionGovernance(predictive);
  const riskGov = runMaintenanceRiskGovernance(signalBundle, predictive);
  const ai = runMaintenanceOperationalAi(signalBundle, reliability, predictive, health);
  const narrative = runMaintenanceNarrativeEngine(reliability, predictive, {
    focus: 'confiabilidade · degradação · disponibilidade'
  });
  const kpi = runMaintenanceNativeKpiAdapter(reliability, health, stability);
  const telemetryRel = runTelemetryReliabilityRuntime(signalBundle, telemetry);

  return {
    telemetry,
    health,
    degradation,
    degradationTrend,
    stability,
    reliability,
    mtbf,
    downtime,
    criticality,
    predictive,
    predictionGov,
    riskGov,
    ai,
    narrative,
    kpi,
    telemetryRel,
    bindings
  };
}

function bindAssetHealth(s, ctx) {
  const h = ctx.health || runMachineHealthRuntime(s);
  return {
    ok: h.asset_health_score != null,
    metrics: { asset_health_score: h.asset_health_score, critical_assets: h.critical_assets },
    summary: h.asset_health_score != null ? `Saúde ativos ${h.asset_health_score}` : 'Sem telemetria de saúde',
    engine_ref: 'maintenance.asset_health'
  };
}

function bindMtbfMttr(s, ctx) {
  const m = ctx.mtbf || runMtbfMttrAnalyzer(s);
  return {
    ok: m.coherence !== 'empty',
    metrics: { mtbf: m.mtbf, mttr: m.mttr },
    summary: m.mtbf != null ? `MTBF ${m.mtbf}h · MTTR ${m.mttr ?? '—'}h` : 'MTBF/MTTR aguardando eventos',
    engine_ref: 'maintenance.mtbf_mttr'
  };
}

function bindPredictive(s, ctx) {
  const p = ctx.predictive || runPredictiveMaintenanceRuntime(s, ctx.degradation);
  return {
    ok: p.failure_risk !== 'unknown',
    metrics: { failure_risk: p.failure_risk },
    summary: p.recommendation || `Risco ${p.failure_risk} — supervisão`,
    engine_ref: 'maintenance.predictive_failure'
  };
}

function bindStability(s, ctx) {
  const st = ctx.stability || runMachineStabilityRuntime(s);
  return {
    ok: st.stability_score != null || st.instability_risk,
    metrics: st,
    summary: `Estabilidade ${st.stability_score ?? '—'} · risco ${st.instability_risk}`,
    engine_ref: 'maintenance.machine_stability'
  };
}

function bindPreventive(s) {
  const op = s.operational || {};
  return {
    ok: true,
    metrics: { maintenance_open: op.maintenance_open },
    summary: `${op.maintenance_open ?? 0} ordens abertas — preventiva supervisionada`,
    engine_ref: 'maintenance.preventive_schedule'
  };
}

function bindHeatmap(s) {
  const op = s.operational || {};
  return {
    ok: (op.downtime_events ?? 0) > 0,
    metrics: { events: op.downtime_events },
    summary: op.downtime_events ? `${op.downtime_events} eventos paragem (30d)` : 'Sem heatmap de paragens',
    engine_ref: 'maintenance.breakdown_heatmap'
  };
}

function bindParts() {
  return { ok: true, metrics: {}, summary: 'Risco peças — dados indisponíveis', engine_ref: 'maintenance.parts_risk' };
}

function bindDowntime(s, ctx) {
  const d = ctx.downtime || runDowntimeCorrelationEngine(s, ctx);
  return {
    ok: d.correlation_valid,
    metrics: { downtime_minutes: d.maintenance_downtime_minutes },
    summary: `Downtime ${d.maintenance_downtime_minutes} min — correlação produção permitida`,
    engine_ref: 'maintenance.downtime_correlation'
  };
}

function bindReliability(s, ctx) {
  const r = ctx.reliability || runReliabilityIntelligenceRuntime(s);
  return {
    ok: r.computed_from_real_data,
    metrics: r,
    summary: r.availability_pct != null ? `Disponibilidade ${r.availability_pct}%` : 'Centro confiabilidade — dados parciais',
    engine_ref: 'maintenance.reliability_center'
  };
}

function bindPatterns(s) {
  const op = s.operational || {};
  return {
    ok: op.failure_recurrence !== 'none',
    metrics: { recurrence: op.failure_recurrence },
    summary: `Recorrência: ${op.failure_recurrence}`,
    engine_ref: 'maintenance.failure_patterns'
  };
}

function bindDegradation(s, ctx) {
  const d = ctx.degradation || runDegradationSignalAnalyzer(s);
  return {
    ok: d.degradation_detected,
    metrics: d,
    summary: d.degradation_detected ? `Degradação · tendência ${d.trend}` : 'Sem degradação detectada',
    engine_ref: 'maintenance.machine_degradation'
  };
}

function bindAi(s, ctx) {
  const ai = ctx.ai || runMaintenanceOperationalAi(s);
  return {
    ok: (ai.questions || []).length > 0,
    metrics: { questions: ai.questions?.length },
    summary: (ai.questions || [])[0]?.a || 'IA manutenção contextual',
    engine_ref: 'maintenance.maintenance_ai'
  };
}

function bindNarrative(s, ctx) {
  const n = ctx.narrative || runMaintenanceNarrativeEngine(ctx.reliability, ctx.predictive, {});
  return {
    ok: !!n.narrative,
    metrics: {},
    summary: n.narrative,
    engine_ref: 'maintenance.maintenance_narrative'
  };
}

function bindAlerts(s, ctx) {
  const p = ctx.predictive || runPredictiveMaintenanceRuntime(s);
  const alerts = p.failure_risk === 'medium' ? [{ severity: 'critical', message: p.recommendation }] : [];
  return { ok: alerts.length > 0, metrics: { alert_count: alerts.length }, summary: 'Alertas preditivos supervisionados', engine_ref: 'maintenance.predictive_alerts', alerts };
}

function bindGovernance(s, ctx) {
  const g = ctx.predictionGov || runMaintenancePredictionGovernance(ctx.predictive);
  return { ok: g.predictive_supervised, metrics: g, summary: 'Governança preditiva — sem auto-acção', engine_ref: 'maintenance.maintenance_governance' };
}

function bindUsefulness() {
  return { ok: true, metrics: { usefulness: 0.75 }, summary: 'Utilidade manutenção cognitiva', engine_ref: 'maintenance.maintenance_usefulness' };
}

function bindCriticality(s, ctx) {
  const c = ctx.criticality || runAssetCriticalityRuntime(s);
  return {
    ok: c.total_assets > 0,
    metrics: c,
    summary: `${c.critical_assets}/${c.total_assets} ativos críticos`,
    engine_ref: 'maintenance.asset_criticality'
  };
}

function bindTelemetry(s, ctx) {
  const t = ctx.telemetry || runMaintenanceTelemetryRuntime(s);
  return {
    ok: t.telemetry_safe,
    metrics: t,
    summary: `Telemetria ${t.readiness}`,
    engine_ref: 'maintenance.telemetry_reliability'
  };
}

module.exports = { invokeMaintenanceBlockBridge, buildMaintenanceEngineContext };
