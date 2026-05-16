'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('../flags/qualityCognitiveRuntimeFlags');
const obs = require('../../../../services/operational/enterpriseObservabilityRuntime');
const budgetSvc = require('../../../../cognitiveBudget/aiContextBudgetService');
const { publishQualityIndustrialEvent } = require('../../events/qualityEventPublisher');
const COG = require('../events/cognitiveEventHints');

const { aggregateSignals } = require('../telemetry/qualityCognitiveSignalAggregator');
const { predictDrift } = require('../drift/qualityDriftPredictionEngine');
const { analyzeRecurrence } = require('../recurrence/qualityRecurrenceAnalysisEngine');
const { scoreSupplierDynamics } = require('../supplier/qualitySupplierScoringEngine');
const { predictAnomalyContext } = require('../anomaly/qualityPredictiveAnomalyEngine');
const { detectDeterioration } = require('../deterioration/qualityProcessDeteriorationEngine');
const { buildRecommendations } = require('../recommendations/qualityContextualRecommendationEngine');
const { buildExecutiveNarrative } = require('../narratives/qualityExecutiveNarrativeEngine');
const { computePredictiveRiskScore } = require('../scoring/qualityPredictiveRiskScore');
const { assessLearningReadiness } = require('../learning/qualityCognitiveLearningReadiness');

const _tenantHits = new Map();

function _throttleOk(tenantId, maxPerMin) {
  const k = String(tenantId || '');
  const max = maxPerMin ?? 48;
  const now = Date.now();
  const w = 60000;
  let h = _tenantHits.get(k);
  if (!h || now > h.resetAt) {
    h = { count: 0, resetAt: now + w };
    _tenantHits.set(k, h);
  }
  h.count++;
  return h.count <= max;
}

async function _maybePublish(partial, meta) {
  if (!flags.isCognitiveIndustrialPublishEnabled()) return { published: false, reason: 'publish_disabled' };
  try {
    await publishQualityIndustrialEvent(partial, meta);
    return { published: true };
  } catch (_e) {
    obs.recordMetric('quality_cognitive_publish_fail_total', 1, {});
    return { published: false, reason: 'publish_error' };
  }
}

function _mapRecommendationsFromEngines(ctx) {
  const findings = [];
  const drift = ctx.drift;
  const rec = ctx.recurrence;
  const sup = ctx.supplier;
  const ano = ctx.anomaly;
  const det = ctx.deterioration;

  if (drift?.ok && (drift.drift_severity === 'high' || drift.drift_severity === 'medium')) {
    findings.push({
      kind: 'increase_sampling',
      priority: drift.drift_severity === 'high' ? 'high' : 'medium',
      rationale: 'Tendência EWMA / variância sugere drift — aumentar cadência de amostragem SPC.',
      evidence_list: drift.explainability?.evidence || [],
      linked_signals: ['drift_prediction'],
      confidence: drift.drift_confidence,
      related_event_hints: [COG.DRIFT_PREDICTED]
    });
  }
  if (rec?.ok && (rec.recurrence_severity === 'high' || rec.recurrence_severity === 'medium')) {
    findings.push({
      kind: 'strengthen_capa_containment',
      priority: 'high',
      rationale: 'Recorrência de eventos na mesma entidade — rever contenção e causa raiz.',
      evidence_list: rec.explainability?.evidence || [],
      linked_signals: ['recurrence'],
      confidence: rec.explainability?.confidence,
      related_event_hints: [COG.RECURRENCE_DETECTED]
    });
  }
  if (sup?.ok && sup.trend === 'worsening') {
    findings.push({
      kind: 'review_supplier',
      priority: 'medium',
      rationale: 'Tendência de PPM em agravamento entre segmentos temporais.',
      evidence_list: sup.explainability?.evidence || [],
      linked_signals: ['supplier_scoring'],
      confidence: sup.explainability?.confidence,
      related_event_hints: [COG.SUPPLIER_SCORE_CHANGED]
    });
  }
  if (ano?.ok && (ano.severity === 'high' || ano.severity === 'medium')) {
    findings.push({
      kind: 'review_process_parameters',
      priority: ano.severity === 'high' ? 'high' : 'medium',
      rationale: 'Proximidade a limites com movimento direccional — rever parâmetros e setup.',
      evidence_list: ano.explainability?.evidence || [],
      linked_signals: ['predictive_anomaly'],
      confidence: ano.pre_anomaly_score,
      related_event_hints: [COG.ANOMALY_PREDICTED]
    });
  }
  if (det?.ok && (det.deterioration_score ?? 0) >= 0.38) {
    findings.push({
      kind: 'advance_maintenance_window',
      priority: det.deterioration_score > 0.62 ? 'high' : 'medium',
      rationale: 'Expansão de dispersão ou tendência de defeitos — antecipar verificação de equipamento.',
      evidence_list: det.explainability?.evidence || [],
      linked_signals: ['process_deterioration'],
      confidence: det.deterioration_confidence,
      related_event_hints: [COG.PROCESS_DETERIORATION_DETECTED]
    });
  }
  return findings;
}

/**
 * Pacote cognitivo assistivo — orquestração local ao domínio Quality (não é orchestrator global).
 * @param {string} companyId
 * @param {string|undefined} userId
 * @param {object} rawSignals
 * @param {object} [opts]
 */
async function runCognitiveQualityPack(companyId, userId, rawSignals, opts = {}) {
  const tAll = Date.now();
  const correlationId = (opts.correlation_id || rawSignals?.correlation_id || uuidv4()).toString();
  const result = {
    ok: true,
    correlation_id: correlationId,
    company_id: companyId,
    skipped: false,
    throttle: null,
    budget: null,
    engines: {},
    recommendations: null,
    narrative: null,
    risk: null,
    learning_readiness: null,
    events: []
  };

  if (!flags.isQualityCognitiveRuntimeEnabled()) {
    result.skipped = true;
    result.reason = 'cognitive_off';
    return result;
  }

  if (!_throttleOk(companyId, opts.max_requests_per_minute)) {
    result.skipped = true;
    result.throttle = { reason: 'tenant_rate_limited' };
    obs.recordMetric('quality_cognitive_throttled_total', 1, {});
    return result;
  }

  try {
    const b = await budgetSvc.resolveBudget({
      company_id: companyId,
      domain: 'quality',
      module: 'quality_cognitive',
      persona: opts.persona,
      user_id: userId
    });
    result.budget = { enabled: b.enabled, budget_tokens: b.budget_tokens ?? null };
    if (b.enabled && b.budget_tokens != null && b.budget_tokens < 400) {
      obs.recordMetric('quality_cognitive_budget_pressure_total', 1, {});
    }
  } catch (_e) {
    result.budget = { enabled: false, error: 'budget_resolve_failed' };
  }

  const signals = aggregateSignals(rawSignals || {});

  if (flags.isDriftPredictionEnabled() && signals.process_values.length >= 8) {
    const t0 = Date.now();
    const drift = predictDrift(signals.process_values, opts.drift || {});
    result.engines.drift = drift;
    obs.recordMetric('quality_drift_prediction_ms', Date.now() - t0, {});
    if (drift.ok && drift.emit_event && opts.emit_events !== false) {
      const pub = await _maybePublish(
        {
          event_name: COG.DRIFT_PREDICTED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: {
            drift_severity: drift.drift_severity,
            drift_confidence: drift.drift_confidence,
            slope_per_step: drift.slope_per_step,
            variance_expansion_ratio: drift.variance_expansion_ratio
          }
        },
        { origin_layer: 'operational', intended_audience: 'supervisor', user_id: userId }
      );
      result.events.push({ type: COG.DRIFT_PREDICTED, ...pub });
    }
  }

  if (flags.isRecurrenceAnalysisEnabled() && signals.recurrence_records.length >= 2) {
    const t0 = Date.now();
    const rec = analyzeRecurrence(signals.recurrence_records, opts.recurrence || {});
    result.engines.recurrence = rec;
    obs.recordMetric('quality_recurrence_analysis_ms', Date.now() - t0, {});
    if (rec.ok && rec.emit_event && opts.emit_events !== false) {
      const pub = await _maybePublish(
        {
          event_name: COG.RECURRENCE_DETECTED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: {
            recurrence_severity: rec.recurrence_severity,
            recurrence_score: rec.recurrence_score,
            dominant_key: rec.dominant_key,
            dominant_count: rec.dominant_count
          }
        },
        { origin_layer: 'operational', intended_audience: 'supervisor', user_id: userId }
      );
      result.events.push({ type: COG.RECURRENCE_DETECTED, ...pub });
    }
    if (rec.ok && rec.dominant_count >= (opts.pattern_threshold ?? 5) && opts.emit_events !== false) {
      const pub = await _maybePublish(
        {
          event_name: COG.PATTERN_DETECTED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: { pattern: 'temporal_recurrence', dominant_key: rec.dominant_key, count: rec.dominant_count }
        },
        { origin_layer: 'operational', intended_audience: 'analyst', user_id: userId }
      );
      result.events.push({ type: COG.PATTERN_DETECTED, ...pub });
    }
  }

  if (flags.isSupplierScoringEnabled() && signals.supplier_rows.length) {
    const t0 = Date.now();
    const sup = scoreSupplierDynamics(signals.supplier_id || 'supplier', signals.supplier_rows, opts.supplier || {});
    result.engines.supplier = sup;
    obs.recordMetric('quality_supplier_scoring_ms', Date.now() - t0, {});
    if (sup.ok && sup.emit_event && opts.emit_events !== false) {
      const pub = await _maybePublish(
        {
          event_name: COG.SUPPLIER_SCORE_CHANGED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: {
            supplier_id: sup.supplier_id,
            trend: sup.trend,
            score_delta: sup.score_delta_second_minus_first,
            base_score: sup.base_scorecard?.quality_score_0_100
          }
        },
        { origin_layer: 'operational', intended_audience: 'management', user_id: userId }
      );
      result.events.push({ type: COG.SUPPLIER_SCORE_CHANGED, ...pub });
    }
  }

  let deterioration = null;
  if (flags.isProcessDeteriorationEnabled() && (signals.process_values.length >= 10 || signals.defect_rates.length >= 6)) {
    const t0 = Date.now();
    deterioration = detectDeterioration(signals.process_values, signals.defect_rates, {
      ...opts.deterioration,
      dimension_labels: signals.dimension_labels
    });
    result.engines.deterioration = deterioration;
    obs.recordMetric('quality_process_deterioration_ms', Date.now() - t0, {});
    if (deterioration.ok && deterioration.emit_event && opts.emit_events !== false) {
      const pub = await _maybePublish(
        {
          event_name: COG.PROCESS_DETERIORATION_DETECTED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: {
            deterioration_score: deterioration.deterioration_score,
            std_ratio: deterioration.std_ratio_second_first,
            operational_impact: deterioration.operational_impact
          }
        },
        { origin_layer: 'operational', intended_audience: 'supervisor', user_id: userId }
      );
      result.events.push({ type: COG.PROCESS_DETERIORATION_DETECTED, ...pub });
    }
  }

  let anomaly = null;
  if (flags.isAnomalyPredictionEnabled()) {
    const t0 = Date.now();
    anomaly = predictAnomalyContext(
      {
        process_values: signals.process_values,
        spc_subgroup_means: signals.spc_subgroup_means,
        usl: signals.usl,
        lsl: signals.lsl,
        recurrence_score: result.engines.recurrence?.recurrence_score,
        drift_confidence: result.engines.drift?.drift_confidence
      },
      opts.anomaly || {}
    );
    result.engines.anomaly = anomaly;
    obs.recordMetric('quality_anomaly_prediction_ms', Date.now() - t0, {});
    if (anomaly.ok && anomaly.emit_event && opts.emit_events !== false) {
      const pub = await _maybePublish(
        {
          event_name: COG.ANOMALY_PREDICTED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: {
            pre_anomaly_score: anomaly.pre_anomaly_score,
            severity: anomaly.severity,
            band: anomaly.band
          }
        },
        { origin_layer: 'operational', intended_audience: 'operator', user_id: userId }
      );
      result.events.push({ type: COG.ANOMALY_PREDICTED, ...pub });
    }
  }

  const riskInputs = {
    drift_confidence: result.engines.drift?.drift_confidence,
    recurrence_score: result.engines.recurrence?.recurrence_score,
    supplier_worsening: result.engines.supplier?.trend === 'worsening',
    pre_anomaly_score: result.engines.anomaly?.pre_anomaly_score,
    deterioration_score: result.engines.deterioration?.deterioration_score
  };
  result.risk = computePredictiveRiskScore(riskInputs);
  if (result.risk.predictive_risk_score >= (opts.risk_escalation_threshold ?? 0.72) && opts.emit_events !== false) {
    const pub = await _maybePublish(
      {
        event_name: COG.RISK_ESCALATED,
        company_id: String(companyId),
        correlation_id: correlationId,
        payload: {
          predictive_risk_score: result.risk.predictive_risk_score,
          inputs: result.risk.inputs
        }
      },
      { origin_layer: 'operational', intended_audience: 'management', user_id: userId }
    );
    result.events.push({ type: COG.RISK_ESCALATED, ...pub });
  }

  if (flags.isContextualRecommendationsEnabled()) {
    const t0 = Date.now();
    const recoFindings = _mapRecommendationsFromEngines({
      drift: result.engines.drift,
      recurrence: result.engines.recurrence,
      supplier: result.engines.supplier,
      anomaly: result.engines.anomaly,
      deterioration: result.engines.deterioration
    });
    const reco = buildRecommendations(recoFindings, {
      company_id: companyId,
      user_id: userId,
      correlation_id: correlationId
    });
    result.recommendations = reco;
    obs.recordMetric('quality_recommendation_runtime_ms', Date.now() - t0, {});
    if (reco.emit_event && reco.recommendations.length && opts.emit_events !== false) {
      const pub = await _maybePublish(
        {
          event_name: COG.RECOMMENDATION_GENERATED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: {
            count: reco.recommendations.length,
            kinds: reco.recommendations.map((r) => r.kind).slice(0, 20)
          }
        },
        { origin_layer: 'operational', intended_audience: 'supervisor', user_id: userId }
      );
      result.events.push({ type: COG.RECOMMENDATION_GENERATED, ...pub });
    }
  }

  if (flags.isExecutiveNarrativesEnabled()) {
    const summary = {
      drift_severity: result.engines.drift?.drift_severity,
      drift_confidence: result.engines.drift?.drift_confidence,
      recurrence_severity: result.engines.recurrence?.recurrence_severity,
      dominant_key: result.engines.recurrence?.dominant_key,
      supplier_trend: result.engines.supplier?.trend,
      pre_anomaly_severity: result.engines.anomaly?.severity,
      deterioration_severity: result.engines.deterioration?.ok
        ? result.engines.deterioration.deterioration_score > 0.62
          ? 'high'
          : result.engines.deterioration.deterioration_score > 0.38
            ? 'medium'
            : 'low'
        : undefined
    };
    result.narrative = buildExecutiveNarrative(summary);
    if (opts.emit_events !== false && (summary.drift_severity === 'high' || result.risk.predictive_risk_score >= 0.55)) {
      const pub = await _maybePublish(
        {
          event_name: COG.EXECUTIVE_INSIGHT_GENERATED,
          company_id: String(companyId),
          correlation_id: correlationId,
          payload: { headline: result.narrative.headline, paragraphs: result.narrative.paragraphs.slice(0, 6) }
        },
        { origin_layer: 'operational', intended_audience: 'executive', user_id: userId }
      );
      result.events.push({ type: COG.EXECUTIVE_INSIGHT_GENERATED, ...pub });
    }
  }

  result.learning_readiness = assessLearningReadiness(signals);

  obs.recordMetric('quality_cognitive_runtime_ms', Date.now() - tAll, {});
  return result;
}

module.exports = {
  runCognitiveQualityPack,
  _throttleOk
};
