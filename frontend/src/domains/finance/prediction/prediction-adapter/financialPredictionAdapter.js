/**
 * FIN-EVOLVE-2.4 — Finance adapter for platform.prediction.public_api.v1.
 * All future trend calculation originates in the certified platform response.
 */
import {
  PLATFORM_PREDICTION_PUBLIC_API,
  discoverPlatformPredictionCapabilities,
  normalizeForecastToPlatformContract,
  getPlatformPredictionConfidence
} from '../../../../platform/prediction/public-api/platformPredictionPublicApi.js';
import { assessPlatformPredictionCertification } from '../../../../platform/prediction/certification/platformPredictionCertification.js';
import {
  FIN_EVOLVE_24_PHASE,
  FIN_EVOLVE_24_PRINCIPLE,
  FINANCIAL_PREDICTION_TARGETS,
  FINANCIAL_PREDICTION_EXCLUDED_TARGETS,
  FINANCIAL_PREDICTION_LANES
} from './financialPredictionConstants.js';
import {
  trackPredictionRequested,
  trackPredictionReceived,
  trackPredictionRejected
} from '../observability/financePredictionObservability.js';

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value, digits = 4) {
  if (!Number.isFinite(Number(value))) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function sumItems(surface) {
  const items = surface?.items || surface?.lots || [];
  if (!Array.isArray(items)) return finite(surface?.total ?? surface?.value);
  return round(
    items.reduce(
      (total, item) =>
        total +
        (finite(item?.total ?? item?.value ?? item?.amount ?? item?.cost ?? item?.current_cost) || 0),
      0
    )
  );
}

export function extractFinancialCurrentValues(economicSnapshot = {}, twinState = null) {
  const indicators = economicSnapshot?.performance?.indicators || {};
  const smart = economicSnapshot?.smartCosting || {};
  const twinNodes = twinState?.overlay?.nodes || [];

  const twinTotal = (key) =>
    round(
      twinNodes.reduce(
        (total, node) => total + (finite(node?.financial?.[key]) || 0),
        0
      )
    );

  return Object.freeze({
    operationalCost: finite(indicators.costReal?.value),
    unitCost: finite(smart.unitCost?.value),
    leakage: finite(indicators.economicLosses?.value),
    valuation: sumItems(smart.lotCosts),
    efficiency: finite(indicators.economicEfficiency?.value),
    costByAsset: sumItems(smart.byAsset) ?? twinTotal('cost_by_asset'),
    costByLine: sumItems(smart.byLine) ?? twinTotal('cost_by_line'),
    costByCostCenter: sumItems(smart.byCostCenter)
  });
}

function unwrapPlatformResponse(response) {
  const data = response?.data?.data ?? response?.data ?? response ?? {};
  return data?.ok && data?.data ? data.data : data;
}

function trendFromPlatform(raw = {}) {
  const series = Array.isArray(raw.series)
    ? raw.series
    : Array.isArray(raw.data)
      ? raw.data
      : Array.isArray(raw.points)
        ? raw.points
        : [];
  const first = finite(series[0]?.value);
  const last = finite(series[series.length - 1]?.value);
  const ratio = first != null && first !== 0 && last != null ? last / first : null;
  return Object.freeze({ series, first, last, ratio });
}

/**
 * Contextualizes a certified platform trend for one Finance target.
 * This is an adapter, not a local forecast: it never creates a trend.
 */
export function adaptPlatformForecastToFinance(rawForecast, target, currentValue, meta = {}) {
  const trend = trendFromPlatform(rawForecast);
  const isDirectPercentage = target.unit === '%' && trend.last != null;
  const predictedValue = isDirectPercentage
    ? trend.last
    : currentValue != null && trend.ratio != null
      ? round(currentValue * trend.ratio)
      : trend.last;

  const normalized = normalizeForecastToPlatformContract(rawForecast, {
    domainId: 'finance',
    targetIndicator: target.id,
    horizon: meta.horizon || '2d',
    pointEstimate: predictedValue,
    predictionId: meta.predictionId || `fin-pred-${target.id}-${Date.now()}`,
    evidenceRefs: [
      `finance.target.${target.id}`,
      `platform.metric.${target.platformMetric}`,
      ...(meta.evidenceRefs || [])
    ],
    limitations: [
      `Finance contextual adapter; trend is owned by ${PLATFORM_PREDICTION_PUBLIC_API.id}`,
      target.unit === '%'
        ? 'Direct platform percentage projection'
        : 'Current Finance value contextualized by the certified platform trend ratio',
      ...(meta.limitations || [])
    ]
  });
  const confidence = getPlatformPredictionConfidence(normalized);

  const valueDelta =
    currentValue != null && predictedValue != null
      ? round(predictedValue - currentValue)
      : null;
  const trendDirection =
    valueDelta == null ? 'unknown' : valueDelta > 0 ? 'up' : valueDelta < 0 ? 'down' : 'stable';

  return Object.freeze({
    ...normalized,
    kind: 'financial_prediction',
    phase: FIN_EVOLVE_24_PHASE,
    principle: FIN_EVOLVE_24_PRINCIPLE,
    target: target.id,
    label: target.label,
    unit: target.unit,
    current_value: currentValue,
    predicted_value: predictedValue,
    delta: valueDelta,
    trend: trendDirection,
    confidence,
    origin: PLATFORM_PREDICTION_PUBLIC_API.id,
    platform_metric: target.platformMetric,
    explanation: Object.freeze({
      source: PLATFORM_PREDICTION_PUBLIC_API.id,
      platformContract: normalized.contract,
      platformMetric: target.platformMetric,
      horizon: normalized.horizon,
      evidence: normalized.evidence_refs,
      limitations: normalized.limitations,
      traceId: normalized.trace_id
    }),
    mutatesOperationalState: false,
    executesActions: false
  });
}

export function validateFinancialPrediction(prediction) {
  const issues = [];
  if (!prediction || prediction.kind !== 'financial_prediction') issues.push('missing prediction');
  if (prediction?.semantic_lane !== FINANCIAL_PREDICTION_LANES.FORECAST) {
    issues.push('invalid semantic lane');
  }
  if (prediction?.predicted_value == null) issues.push('missing predicted value');
  if (!prediction?.horizon) issues.push('missing horizon');
  if (!prediction?.confidence?.ok || prediction?.confidence_score == null) {
    issues.push('missing confidence');
  }
  if (!prediction?.evidence_refs?.length) issues.push('missing evidence');
  if (!prediction?.limitations?.length) issues.push('missing limitations');
  if (!prediction?.explanation?.source) issues.push('missing explanation');
  if (prediction?.target === 'energy') issues.push('energy excluded from Wave 1');
  if (prediction?.mutatesOperationalState) issues.push('must not mutate state');
  return { valid: issues.length === 0, issues };
}

/**
 * Requests only certified platform metrics via the provided dashboard.forecasting client.
 */
export async function requestFinancialPredictions({
  forecastingClient,
  economicSnapshot = {},
  twinState = null,
  currentValues = null,
  horizon = '2d',
  targets = FINANCIAL_PREDICTION_TARGETS,
  emitEvents = true
} = {}) {
  const certification = assessPlatformPredictionCertification();
  if (!certification.gate.openFinEvolve24AsPlatformConsumer) {
    const error = 'platform_prediction_not_certified';
    if (emitEvents) trackPredictionRejected({ reason: error });
    return Object.freeze({ ok: false, error, predictions: Object.freeze([]) });
  }
  if (!forecastingClient || typeof forecastingClient.getProjections !== 'function') {
    const error = 'certified_forecasting_client_required';
    if (emitEvents) trackPredictionRejected({ reason: error });
    return Object.freeze({ ok: false, error, predictions: Object.freeze([]) });
  }

  const discovery = discoverPlatformPredictionCapabilities('finance');
  const values = currentValues || extractFinancialCurrentValues(economicSnapshot, twinState);
  const safeTargets = targets.filter(
    (target) =>
      target.id !== 'energy' &&
      !FINANCIAL_PREDICTION_EXCLUDED_TARGETS.some((excluded) => excluded.id === target.id)
  );
  const platformMetrics = [...new Set(safeTargets.map((target) => target.platformMetric))];

  if (emitEvents) {
    trackPredictionRequested({
      targetCount: safeTargets.length,
      platformMetrics,
      api: PLATFORM_PREDICTION_PUBLIC_API.id
    });
  }

  try {
    const responses = await Promise.all(
      platformMetrics.map(async (metric) => {
        const response = await forecastingClient.getProjections(metric);
        return [metric, unwrapPlatformResponse(response)];
      })
    );
    const byMetric = Object.fromEntries(responses);
    const predictions = safeTargets
      .map((target) =>
        adaptPlatformForecastToFinance(
          byMetric[target.platformMetric] || {},
          target,
          finite(values[target.currentKey]),
          { horizon }
        )
      )
      .filter((prediction) => validateFinancialPrediction(prediction).valid);

    if (emitEvents) {
      trackPredictionReceived({
        predictionCount: predictions.length,
        api: PLATFORM_PREDICTION_PUBLIC_API.id
      });
    }

    return Object.freeze({
      ok: true,
      phase: FIN_EVOLVE_24_PHASE,
      principle: FIN_EVOLVE_24_PRINCIPLE,
      api: PLATFORM_PREDICTION_PUBLIC_API.id,
      contract: discovery.contract,
      predictions: Object.freeze(predictions),
      exclusions: FINANCIAL_PREDICTION_EXCLUDED_TARGETS,
      limitations: discovery.limitations,
      semanticLane: FINANCIAL_PREDICTION_LANES.FORECAST,
      mutatesOperationalState: false,
      executesActions: false
    });
  } catch (error) {
    const reason = error?.message || 'platform_prediction_request_failed';
    if (emitEvents) trackPredictionRejected({ reason });
    return Object.freeze({
      ok: false,
      error: reason,
      predictions: Object.freeze([]),
      api: PLATFORM_PREDICTION_PUBLIC_API.id
    });
  }
}

export function validateFinancialPredictionAdapter() {
  const issues = [];
  if (PLATFORM_PREDICTION_PUBLIC_API.id !== 'platform.prediction.public_api.v1') {
    issues.push('wrong platform API');
  }
  if (FINANCIAL_PREDICTION_TARGETS.some((target) => target.id === 'energy')) {
    issues.push('energy must be excluded');
  }
  if (FINANCIAL_PREDICTION_TARGETS.length < 8) issues.push('Wave 1 targets incomplete');
  return { valid: issues.length === 0, issues, phase: FIN_EVOLVE_24_PHASE };
}

