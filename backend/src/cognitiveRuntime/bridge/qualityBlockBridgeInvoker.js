'use strict';

const { v4: uuidv4 } = require('uuid');
const { resolveBridgeConfig } = require('./qualityEngineBridgeRegistry');
const { aggregateSignals } = require('../../domains/quality/cognitive/telemetry/qualityCognitiveSignalAggregator');
const { predictDrift } = require('../../domains/quality/cognitive/drift/qualityDriftPredictionEngine');
const { analyzeRecurrence } = require('../../domains/quality/cognitive/recurrence/qualityRecurrenceAnalysisEngine');
const { scoreSupplierDynamics } = require('../../domains/quality/cognitive/supplier/qualitySupplierScoringEngine');
const { detectDeterioration } = require('../../domains/quality/cognitive/deterioration/qualityProcessDeteriorationEngine');
const { buildExecutiveNarrative } = require('../../domains/quality/cognitive/narratives/qualityExecutiveNarrativeEngine');
const { buildRecommendations } = require('../../domains/quality/cognitive/recommendations/qualityContextualRecommendationEngine');
const { buildAuditEnvelope } = require('../../domains/quality/cognitive/audit/qualityCognitiveAuditEnvelope');
const flagsZ20 = require('../config/phaseZ20FeatureFlags');

function bindNcCenter(signals, ctx) {
  const op = signals.operational || {};
  return {
    ok: true,
    metrics: {
      open_nc: op.open_nc ?? 0,
      total_tracked: op.total_proposals ?? 0
    },
    summary: `NC abertas (proxy proposals): ${op.open_nc ?? 0}`,
    engine_ref: 'quality.nc_events'
  };
}

function bindCapaEngine(signals, ctx) {
  const open = signals.operational?.open_nc ?? 0;
  const pendingEstimate = Math.max(0, Math.round(open * 0.35));
  return {
    ok: true,
    metrics: { capa_pending: pendingEstimate, open_nc: open },
    summary: `CAPA estimadas em aberto: ${pendingEstimate}`,
    engine_ref: 'quality.capa_workflow'
  };
}

function bindSpcMonitor(raw, config) {
  const agg = aggregateSignals(raw);
  if (agg.process_values.length < (config.min_process_points || 8)) {
    return {
      ok: false,
      reason: 'insufficient_process_values',
      metrics: { points: agg.process_values.length },
      engine_ref: config.engine_ref
    };
  }
  const drift = predictDrift(agg.process_values, { emit_event: false });
  return {
    ok: drift.ok,
    metrics: {
      drift_severity: drift.drift_severity,
      drift_confidence: drift.drift_confidence,
      slope_per_step: drift.slope_per_step ?? null
    },
    summary: drift.ok
      ? `SPC/drift: ${drift.drift_severity} (conf. ${((drift.drift_confidence || 0) * 100).toFixed(0)}%)`
      : 'SPC: dados insuficientes',
    engine_output: drift,
    engine_ref: config.engine_ref
  };
}

function bindAuditGovernance(signals, ctx) {
  const envelope = buildAuditEnvelope({
    companyId: ctx.tenant_id,
    userId: ctx.user_id,
    correlationId: ctx.correlation_id || uuidv4(),
    engineId: 'quality.audit_governance',
    payloadSummary: {
      open_nc: signals.operational?.open_nc,
      sectors: (signals.operational?.sector_breakdown || []).length
    }
  });
  return {
    ok: true,
    metrics: {
      sectors_audited: (signals.operational?.sector_breakdown || []).length,
      compliance_proxy_score: signals.operational?.open_nc === 0 ? 100 : 72
    },
    summary: 'Governança de auditoria — envelope cognitivo registado',
    engine_output: envelope,
    engine_ref: 'quality.audit_trail'
  };
}

function bindSupplierIntelligence(raw, config) {
  const agg = aggregateSignals(raw);
  if (!agg.supplier_rows.length) {
    return {
      ok: false,
      reason: 'no_supplier_data',
      metrics: {},
      summary: 'Fornecedores: sem dados de lote no tenant',
      engine_ref: config.engine_ref
    };
  }
  const sup = scoreSupplierDynamics(agg.supplier_id || 'default', agg.supplier_rows, { emit_event: false });
  return {
    ok: sup.ok,
    metrics: { trend: sup.trend, score: sup.base_scorecard?.quality_score_0_100 },
    summary: sup.ok ? `Fornecedor: tendência ${sup.trend}` : 'Fornecedor: scoring indisponível',
    engine_output: sup,
    engine_ref: config.engine_ref
  };
}

function bindContextualQualityAi(engineCtx, ctx) {
  const rec = buildRecommendations(engineCtx.findings || [], {
    company_id: ctx.tenant_id,
    user_id: ctx.user_id,
    correlation_id: ctx.correlation_id
  });
  return {
    ok: true,
    metrics: { recommendations_count: (rec.recommendations || []).length },
    summary: 'IA contextual: recomendações assistivas compiladas',
    engine_output: rec,
    engine_ref: 'quality.cognitive_orchestrator'
  };
}

function bindQualityNarrative(engineCtx) {
  const narrative = buildExecutiveNarrative(engineCtx.summary || {});
  return {
    ok: narrative.ok,
    metrics: { paragraphs: (narrative.paragraphs || []).length },
    summary: narrative.headline || 'Narrativa quality',
    engine_output: narrative,
    engine_ref: 'quality.executive_narrative'
  };
}

function bindProcessStability(raw, config) {
  const agg = aggregateSignals(raw);
  if (agg.process_values.length < (config.min_process_points || 10)) {
    return {
      ok: false,
      reason: 'insufficient_series',
      engine_ref: config.engine_ref
    };
  }
  const det = detectDeterioration(agg.process_values, agg.defect_rates, { emit_event: false });
  return {
    ok: det.ok,
    metrics: {
      deterioration_score: det.deterioration_score,
      operational_impact: det.operational_impact
    },
    summary: det.ok
      ? `Estabilidade: score ${(det.deterioration_score ?? 0).toFixed(2)}`
      : 'Estabilidade: série insuficiente',
    engine_output: det,
    engine_ref: config.engine_ref
  };
}

function bindNonconformityHeatmap(signals) {
  const sectors = signals.operational?.sector_breakdown || [];
  return {
    ok: sectors.length > 0,
    metrics: { sectors: sectors.length, top_sector: sectors[0]?.sector || null },
    heatmap: sectors,
    summary: sectors.length
      ? `Heatmap NC: ${sectors.length} setores, pico ${sectors[0]?.sector} (${sectors[0]?.count})`
      : 'Heatmap NC: sem setores',
    engine_ref: 'quality.nc_heatmap'
  };
}

function bindRecurrenceAnalysis(raw, config) {
  const agg = aggregateSignals(raw);
  if (agg.recurrence_records.length < (config.min_records || 2)) {
    return {
      ok: false,
      reason: 'insufficient_records',
      engine_ref: config.engine_ref
    };
  }
  const rec = analyzeRecurrence(agg.recurrence_records, { emit_event: false });
  return {
    ok: rec.ok,
    metrics: {
      recurrence_severity: rec.recurrence_severity,
      dominant_key: rec.dominant_key,
      dominant_count: rec.dominant_count
    },
    summary: rec.ok
      ? `Reincidência ${rec.recurrence_severity}: ${rec.dominant_key}`
      : 'Reincidência: registos insuficientes',
    engine_output: rec,
    engine_ref: config.engine_ref
  };
}

function buildEngineContext(signals, bindings = []) {
  const summary = {};
  for (const b of bindings) {
    if (!b.engine_output) continue;
    const o = b.engine_output;
    if (o.drift_severity) summary.drift_severity = o.drift_severity;
    if (o.drift_confidence != null) summary.drift_confidence = o.drift_confidence;
    if (o.recurrence_severity) summary.recurrence_severity = o.recurrence_severity;
    if (o.dominant_key) summary.dominant_key = o.dominant_key;
    if (o.trend) summary.supplier_trend = o.trend;
    if (o.deterioration_score != null) {
      summary.deterioration_severity =
        o.deterioration_score > 0.62 ? 'high' : o.deterioration_score > 0.38 ? 'medium' : 'low';
    }
  }
  const findings = [];
  for (const b of bindings) {
    if (!b.engine_ok) continue;
    if (b.block_id === 'quality.spc_monitor' && b.metrics?.drift_severity) {
      findings.push({
        kind: 'increase_sampling',
        rationale: b.summary,
        priority: b.metrics.drift_severity === 'high' ? 'high' : 'medium',
        confidence: 0.7
      });
    }
    if (b.block_id === 'quality.recurrence_analysis' && b.metrics?.recurrence_severity) {
      findings.push({
        kind: 'strengthen_capa_containment',
        rationale: b.summary,
        priority: 'high',
        confidence: 0.75
      });
    }
    if (b.block_id === 'quality.process_stability' && b.metrics?.deterioration_score >= 0.38) {
      findings.push({
        kind: 'advance_maintenance_window',
        rationale: b.summary,
        priority: b.metrics.deterioration_score > 0.62 ? 'high' : 'medium',
        confidence: 0.65
      });
    }
  }
  return { summary, findings };
}

const HANDLERS = {
  bindNcCenter,
  bindCapaEngine,
  bindSpcMonitor,
  bindAuditGovernance,
  bindSupplierIntelligence,
  bindContextualQualityAi,
  bindQualityNarrative,
  bindProcessStability,
  bindNonconformityHeatmap,
  bindRecurrenceAnalysis
};

/**
 * Invoca bridge para um bloco — direct engine (Z.20), independente do flag global cognitive runtime.
 */
function invokeBlockBridge(blockId, signalBundle = {}, ctx = {}) {
  if (!flagsZ20.allowDirectEngineInvocation() && !flagsZ20.isQualityEngineBridgeEnabled()) {
    return {
      block_id: blockId,
      bridge_status: 'bridge_off',
      data_status: 'not_invoked'
    };
  }

  const config = resolveBridgeConfig(blockId);
  if (!config?.handler) {
    return {
      block_id: blockId,
      bridge_status: 'no_bridge_config',
      data_status: 'unbound'
    };
  }

  const handler = HANDLERS[config.handler];
  if (!handler) {
    return { block_id: blockId, bridge_status: 'handler_missing', data_status: 'error' };
  }

  try {
    let result;
    const raw = signalBundle.raw || {};
    const op = signalBundle;

    switch (config.handler) {
      case 'bindNcCenter':
      case 'bindCapaEngine':
      case 'bindAuditGovernance':
      case 'bindNonconformityHeatmap':
        result = handler(op, ctx);
        break;
      case 'bindSpcMonitor':
      case 'bindSupplierIntelligence':
      case 'bindProcessStability':
      case 'bindRecurrenceAnalysis':
        result = handler(raw, config);
        break;
      case 'bindContextualQualityAi':
        result = handler(ctx._engine_context || { findings: [] }, ctx);
        break;
      case 'bindQualityNarrative':
        result = handler(ctx._engine_context || { summary: {} });
        break;
      default:
        result = { ok: false, reason: 'unknown_handler' };
    }

    return {
      block_id: blockId,
      bridge_status: result.ok ? 'bound_z20' : 'bound_empty',
      data_status: result.ok ? 'engine_bound' : 'graceful_empty',
      engine_ref: result.engine_ref || config.engine_ref,
      metrics: result.metrics || {},
      summary: result.summary || null,
      heatmap: result.heatmap || null,
      engine_invoked: true,
      engine_ok: result.ok === true,
      assistive_only: true,
      render_active: false
    };
  } catch (err) {
    return {
      block_id: blockId,
      bridge_status: 'bridge_error',
      data_status: 'error',
      error: err?.message || 'invoke_failed',
      engine_invoked: false
    };
  }
}

module.exports = {
  invokeBlockBridge,
  buildEngineContext,
  HANDLERS
};
