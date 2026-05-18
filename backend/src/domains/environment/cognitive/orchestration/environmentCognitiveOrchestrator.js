'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('../flags/environmentCognitiveRuntimeFlags');
const obs = require('../shared/environmentCognitiveObservability');
const { publishEnvironmentIndustrialEvent } = require('../../events/environmentEventPublisher');
const COG = require('../events/cognitiveEventHints');
const { aggregateSignals } = require('../telemetry/environmentCognitiveSignalAggregator');
const pred = require('../prediction/environmentPredictionEngines');
const corr = require('../correlation/environmentCorrelationEngines');
const { buildRecommendationsFromPack } = require('../recommendations/environmentRecommendationEngines');
const exp = require('../explainability/environmentExplainabilityRuntimes');
const { environmentCognitiveMaturityRuntime } = require('../runtime/environmentCognitiveMaturityRuntime');

const _tenantHits = new Map();

function _throttleOk(tenantId, maxPerMin = 40) {
  const k = String(tenantId || '');
  const now = Date.now();
  const w = 60000;
  let h = _tenantHits.get(k);
  if (!h || now > h.resetAt) {
    h = { count: 0, resetAt: now + w };
    _tenantHits.set(k, h);
  }
  h.count++;
  return h.count <= maxPerMin;
}

async function _maybePublish(partial, meta) {
  if (!flags.isEnvironmentCognitivePublishEnabled()) return { published: false, reason: 'publish_disabled' };
  try {
    await publishEnvironmentIndustrialEvent(partial, meta);
    return { published: true };
  } catch {
    obs.record('environment_cognitive_publish_fail_total', 1, {});
    return { published: false, reason: 'publish_error' };
  }
}

/**
 * @param {string} companyId
 * @param {string|undefined} userId
 * @param {object} rawSignals
 * @param {object} [opts]
 */
async function runCognitiveEnvironmentPack(companyId, userId, rawSignals, opts = {}) {
  const tAll = Date.now();
  const correlationId = (opts.correlation_id || rawSignals?.correlation_id || uuidv4()).toString();
  const result = {
    ok: true,
    correlation_id: correlationId,
    company_id: companyId,
    skipped: false,
    throttle: null,
    engines: {},
    risk: null,
    drift: null,
    trend: null,
    overflow: null,
    emission: null,
    deterioration: null,
    energy: null,
    waste: null,
    cross_domain: null,
    recommendations: null,
    narrative: null,
    reasoning: null,
    maturity: null,
    explainability: null,
    events: [],
    assistive_only: true,
    no_authority: true
  };

  if (!flags.isEnvironmentCognitiveRuntimeEnabled()) {
    result.skipped = true;
    result.reason = 'cognitive_off';
    return result;
  }

  if (!_throttleOk(companyId, opts.max_requests_per_minute)) {
    result.skipped = true;
    result.throttle = { reason: 'tenant_rate_limited' };
    obs.record('environment_cognitive_throttled_total', 1, {});
    return result;
  }

  const signals = aggregateSignals(rawSignals || {});
  const innerPack = {};

  if (flags.isEnvironmentPredictionEnabled()) {
    const t0 = Date.now();
    result.risk = pred.environmentRiskPredictionEngine(signals);
    innerPack.risk = result.risk;
    obs.record('environment_prediction_runtime_ms', Date.now() - t0, { engine: 'risk' });

    if (signals.water_flow.length >= 6 || signals.effluent_ph.length >= 6) {
      const t1 = Date.now();
      result.drift = pred.environmentDriftPredictionEngine(
        signals.water_flow.length >= 6 ? signals.water_flow : signals.effluent_ph
      );
      innerPack.drift = result.drift;
      obs.record('environment_prediction_runtime_ms', Date.now() - t1, { engine: 'drift' });
    }

    if (signals.reservoir_level.length) {
      result.overflow = pred.environmentOverflowPredictionEngine(signals.reservoir_level, opts.reservoir_capacity);
      innerPack.overflow = result.overflow;
    }

    if (signals.emissions_co2.length >= 6) {
      result.emission = pred.environmentEmissionPredictionEngine(signals.emissions_co2, opts.emission_limit);
      innerPack.emission = result.emission;
    }

    if (signals.energy_demand.length >= 6) {
      result.energy = pred.environmentEnergyPredictionEngine(signals.energy_demand);
      innerPack.energy = result.energy;
    }

    const detSeries = signals.effluent_ph.length >= 8 ? signals.effluent_ph : signals.water_flow;
    if (detSeries.length >= 8) {
      result.deterioration = pred.environmentDeteriorationPredictionEngine(detSeries);
      innerPack.deterioration = result.deterioration;
    }

    if (signals.waste_generation.length >= 6) {
      result.waste = pred.environmentWastePredictionEngine(signals.waste_generation);
      innerPack.waste = result.waste;
    }

    const trendSeries = signals.water_flow.length ? signals.water_flow : signals.emissions_co2;
    if (trendSeries.length >= 6) {
      result.trend = pred.environmentTrendPredictionEngine(trendSeries);
      innerPack.trend = result.trend;
    }
  }

  if (flags.isEnvironmentCrossDomainCorrelationEnabled()) {
    const t0 = Date.now();
    result.cross_domain = corr.environmentCrossDomainCognitiveRuntime(signals);
    innerPack.cross_domain = result.cross_domain;
    obs.record('environment_cross_domain_correlation_score', result.cross_domain.cross_domain_correlation_score || 0, {});
    obs.record('environment_cognitive_runtime_ms', Date.now() - t0, { scope: 'correlation' });
  }

  if (opts.emit_events !== false) {
    const pubRisk = result.risk?.emit_event
      ? await _maybePublish(
          {
            event_name: COG.RISK_PREDICTED,
            company_id: companyId,
            correlation_id: correlationId,
            payload: {
              environmental_risk_score: result.risk.environmental_risk_score,
              severity: result.risk.severity
            }
          },
          { origin_layer: 'operational', intended_audience: 'coordinator', user_id: userId }
        )
      : null;
    if (pubRisk) result.events.push({ type: COG.RISK_PREDICTED, ...pubRisk });

    if (result.drift?.emit_event) {
      const pub = await _maybePublish(
        {
          event_name: COG.DRIFT_DETECTED,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { severity: result.drift.severity, probability: result.drift.probability }
        },
        { origin_layer: 'operational', intended_audience: 'operator', user_id: userId }
      );
      result.events.push({ type: COG.DRIFT_DETECTED, ...pub });
    }

    if (result.trend?.emit_event) {
      const pub = await _maybePublish(
        {
          event_name: COG.TREND_DETECTED,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { label: result.trend.label, severity: result.trend.severity }
        },
        { origin_layer: 'operational', intended_audience: 'coordinator', user_id: userId }
      );
      result.events.push({ type: COG.TREND_DETECTED, ...pub });
    }

    if (result.overflow?.emit_event) {
      const pub = await _maybePublish(
        {
          event_name: COG.OVERFLOW_RISK,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { overflow_risk_score: result.overflow.overflow_risk_score }
        },
        { origin_layer: 'operational', intended_audience: 'operator', user_id: userId }
      );
      result.events.push({ type: COG.OVERFLOW_RISK, ...pub });
    }

    if (result.emission?.emit_event) {
      const pub = await _maybePublish(
        {
          event_name: COG.EXCESS_EMISSION_RISK,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { excess_emission_risk: result.emission.excess_emission_risk }
        },
        { origin_layer: 'operational', intended_audience: 'coordinator', user_id: userId }
      );
      result.events.push({ type: COG.EXCESS_EMISSION_RISK, ...pub });
    }

    if (result.cross_domain?.emit_event) {
      const pub = await _maybePublish(
        {
          event_name: COG.CROSS_DOMAIN_CORRELATION_DETECTED,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { score: result.cross_domain.cross_domain_correlation_score }
        },
        { origin_layer: 'operational', intended_audience: 'manager', user_id: userId }
      );
      result.events.push({ type: COG.CROSS_DOMAIN_CORRELATION_DETECTED, ...pub });
    }
  }

  if (flags.isEnvironmentContextualRecommendationsEnabled()) {
    const t0 = Date.now();
    result.recommendations = buildRecommendationsFromPack(innerPack, {
      company_id: companyId,
      user_id: userId,
      correlation_id: correlationId
    });
    obs.record('environment_recommendation_runtime_ms', Date.now() - t0, {});
    if (result.recommendations.emit_event && opts.emit_events !== false) {
      const pub = await _maybePublish(
        {
          event_name: COG.RECOMMENDATION_GENERATED,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { count: result.recommendations.count }
        },
        { origin_layer: 'operational', intended_audience: 'coordinator', user_id: userId }
      );
      result.events.push({ type: COG.RECOMMENDATION_GENERATED, ...pub });
    }
  }

  if (flags.isEnvironmentExplainabilityEnabled()) {
    const t0 = Date.now();
    result.reasoning = exp.environmentReasoningRuntime(innerPack);
    obs.record('environment_reasoning_runtime_ms', Date.now() - t0, {});
    if (opts.emit_events !== false) {
      const pub = await _maybePublish(
        {
          event_name: COG.REASONING_GENERATED,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { steps: result.reasoning.reasoning_chain?.length || 0 }
        },
        { origin_layer: 'operational', intended_audience: 'analyst', user_id: userId }
      );
      result.events.push({ type: COG.REASONING_GENERATED, ...pub });
    }
    obs.record('environment_explainability_runtime_ms', Date.now() - t0, {});
  }

  if (flags.isEnvironmentNarrativesEnabled()) {
    result.narrative = exp.environmentNarrativeRuntime(innerPack);
    if (opts.emit_events !== false && result.narrative.paragraphs?.length) {
      const pub = await _maybePublish(
        {
          event_name: COG.ENVIRONMENTAL_NARRATIVE_GENERATED,
          company_id: companyId,
          correlation_id: correlationId,
          payload: { headline: result.narrative.headline }
        },
        { origin_layer: 'operational', intended_audience: 'manager', user_id: userId }
      );
      result.events.push({ type: COG.ENVIRONMENTAL_NARRATIVE_GENERATED, ...pub });
    }
  }

  result.maturity = environmentCognitiveMaturityRuntime({ ...innerPack, recommendations: result.recommendations, narrative: result.narrative, reasoning: result.reasoning });
  obs.record('environment_environmental_risk_score', result.risk?.environmental_risk_score || 0, {});
  obs.record('environment_environmental_maturity_score', result.maturity.environmental_maturity_score || 0, {});
  obs.record('environment_cognitive_density_score', result.maturity.cognitive_density_score || 0, {});
  obs.record('environment_cognitive_runtime_ms', Date.now() - tAll, {});

  return result;
}

module.exports = { runCognitiveEnvironmentPack, _throttleOk };
