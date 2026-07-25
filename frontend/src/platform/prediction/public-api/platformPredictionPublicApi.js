/**
 * PRED-BASE-002 — Official public API baseline for platform prediction consumers.
 * Adapts existing dashboard.forecasting.* — does not create new backend motors.
 */
import {
  PRED_BASE_002_PHASE,
  PRED_BASE_002_PRINCIPLE
} from '../certification/predBase002Constants.js';
import { ENTERPRISE_PREDICTION_CONTRACT } from '../contracts/enterprisePredictionContracts.js';
import { PLATFORM_PREDICTION_SEMANTIC_LANES } from '../predBaseConstants.js';
import {
  CERTIFIED_PREDICTION_REGISTRY,
  listCertifiedCapabilities,
  listCapabilitiesForConsumer
} from '../registry/certifiedPredictionRegistry.js';
import { PREDICTION_COVERAGE_MATRIX, listInitialWaveCoverage } from '../coverage/predictionCoverageMatrix.js';

/** Canonical client mounts already present in frontend/src/services/api.js */
export const PLATFORM_PREDICTION_PUBLIC_MOUNTS = Object.freeze({
  getProjections: 'dashboard.forecasting.getProjections',
  getAlerts: 'dashboard.forecasting.getAlerts',
  getHealth: 'dashboard.forecasting.getHealth',
  getExtendedProjections: 'dashboard.forecasting.getExtendedProjections',
  getProfitLoss: 'dashboard.forecasting.getProfitLoss',
  getCriticalFactors: 'dashboard.forecasting.getCriticalFactors',
  getSimulation: 'dashboard.forecasting.getSimulation',
  simulateDecision: 'dashboard.forecasting.simulateDecision',
  getConfig: 'dashboard.forecasting.getConfig'
});

export const PLATFORM_PREDICTION_PUBLIC_API = Object.freeze({
  id: 'platform.prediction.public_api.v1',
  phase: PRED_BASE_002_PHASE,
  principle: PRED_BASE_002_PRINCIPLE,
  contract: ENTERPRISE_PREDICTION_CONTRACT.id,
  createsNewBackend: false,
  operations: Object.freeze([
    Object.freeze({
      id: 'discover',
      description: 'Discover certified prediction capabilities + coverage',
      returns: 'capabilities, coverage, limitations, semantic_lanes'
    }),
    Object.freeze({
      id: 'query_prediction',
      description: 'Query forecast via certified operational mounts',
      mount: PLATFORM_PREDICTION_PUBLIC_MOUNTS.getProjections,
      normalizesTo: ENTERPRISE_PREDICTION_CONTRACT.id
    }),
    Object.freeze({
      id: 'query_confidence',
      description: 'Extract confidence / band metadata from normalized prediction',
      requires: 'normalizeForecastToPlatformContract'
    }),
    Object.freeze({
      id: 'query_metadata',
      description: 'Health, config, critical factors metadata',
      mounts: Object.freeze([
        PLATFORM_PREDICTION_PUBLIC_MOUNTS.getHealth,
        PLATFORM_PREDICTION_PUBLIC_MOUNTS.getConfig,
        PLATFORM_PREDICTION_PUBLIC_MOUNTS.getCriticalFactors
      ])
    }),
    Object.freeze({
      id: 'query_limitations',
      description: 'Platform + capability limitations including energy exclusion'
    })
  ]),
  semanticLanes: PLATFORM_PREDICTION_SEMANTIC_LANES,
  note: 'simulateDecision / getSimulation outputs are simulated_scenario — never forecast_prediction'
});

/**
 * Discovery — sync, no network. Official consumer entrypoint.
 */
export function discoverPlatformPredictionCapabilities(domain = null) {
  const capabilities = domain
    ? listCapabilitiesForConsumer(domain)
    : listCertifiedCapabilities();
  return Object.freeze({
    api: PLATFORM_PREDICTION_PUBLIC_API.id,
    contract: ENTERPRISE_PREDICTION_CONTRACT.id,
    phase: PRED_BASE_002_PHASE,
    domain: domain || 'all',
    capabilities,
    coverageInitialWave: listInitialWaveCoverage(),
    coverageAll: PREDICTION_COVERAGE_MATRIX,
    mounts: PLATFORM_PREDICTION_PUBLIC_MOUNTS,
    semanticLanes: PLATFORM_PREDICTION_SEMANTIC_LANES,
    limitations: Object.freeze([
      'Energy (GAP-PB-003) excluded from initial certified coverage',
      'AIOI forecasts PARTIAL — not required for initial wave',
      'No domain may fork a parallel prediction engine',
      'PREDICT WITHOUT DECIDING — no auto-execution'
    ])
  });
}

/**
 * Normalize an operational projection payload into platform.prediction.v0 shape.
 * Does not call backend — pure adapter for consumers.
 */
export function normalizeForecastToPlatformContract(raw = {}, meta = {}) {
  const series = Array.isArray(raw.series)
    ? raw.series
    : Array.isArray(raw.data)
      ? raw.data
      : Array.isArray(raw.points)
        ? raw.points
        : [];
  const last = series.length ? series[series.length - 1] : null;
  const point =
    meta.pointEstimate ??
    last?.value ??
    raw.point_estimate ??
    raw.value ??
    null;

  const confidence =
    meta.confidenceScore ??
    raw.confidence ??
    (point != null ? 0.55 : 0);

  const bandPad = Math.abs(Number(point) || 0) * 0.1;

  return Object.freeze({
    prediction_id: meta.predictionId || `plat-pred-${Date.now()}`,
    target_indicator: meta.targetIndicator || raw.metric || raw.metricType || 'eficiencia',
    domain_id: meta.domainId || 'platform',
    horizon: meta.horizon || '2d',
    point_estimate: point,
    confidence_score: confidence,
    confidence_band_low: meta.bandLow ?? (point != null ? Number(point) - bandPad : null),
    confidence_band_high: meta.bandHigh ?? (point != null ? Number(point) + bandPad : null),
    confidence_method: meta.confidenceMethod || 'operational_forecasting_heuristic_v1',
    semantic_lane: PLATFORM_PREDICTION_SEMANTIC_LANES.FORECAST_PREDICTION,
    evidence_refs: Object.freeze([
      ...(meta.evidenceRefs || []),
      'dashboard.forecasting.getProjections',
      'operationalForecastingService'
    ]),
    limitations: Object.freeze([
      ...(meta.limitations || []),
      'Certified platform adapter — not a domain product forecast',
      'Energy coverage excluded unless explicitly expanded later'
    ]),
    trace_id: meta.traceId || `trace-ops-forecast`,
    contract: ENTERPRISE_PREDICTION_CONTRACT.id,
    contract_version: ENTERPRISE_PREDICTION_CONTRACT.version,
    raw_mount: PLATFORM_PREDICTION_PUBLIC_MOUNTS.getProjections
  });
}

export function getPlatformPredictionConfidence(normalized) {
  if (!normalized || normalized.semantic_lane !== PLATFORM_PREDICTION_SEMANTIC_LANES.FORECAST_PREDICTION) {
    return Object.freeze({ ok: false, error: 'requires_forecast_prediction_lane' });
  }
  return Object.freeze({
    ok: true,
    prediction_id: normalized.prediction_id,
    confidence_score: normalized.confidence_score,
    confidence_band_low: normalized.confidence_band_low,
    confidence_band_high: normalized.confidence_band_high,
    confidence_method: normalized.confidence_method,
    chain: ENTERPRISE_PREDICTION_CONTRACT.confidence.chain
  });
}

export function getPlatformPredictionLimitations() {
  return discoverPlatformPredictionCapabilities().limitations;
}

export function validatePlatformPredictionPublicApi() {
  const issues = [];
  if (PLATFORM_PREDICTION_PUBLIC_API.createsNewBackend) {
    issues.push('public API must not create new backend');
  }
  if (PLATFORM_PREDICTION_PUBLIC_API.operations.length < 5) {
    issues.push('public API operations incomplete');
  }
  const disc = discoverPlatformPredictionCapabilities('finance');
  if (!disc.capabilities.length) issues.push('finance must discover at least one capability');
  const norm = normalizeForecastToPlatformContract(
    { metric: 'eficiencia', series: [{ point: 'agora', value: 80 }, { point: '2d', value: 76 }] },
    { domainId: 'finance', horizon: '2d' }
  );
  if (norm.semantic_lane !== PLATFORM_PREDICTION_SEMANTIC_LANES.FORECAST_PREDICTION) {
    issues.push('normalize must set forecast_prediction');
  }
  if (norm.point_estimate !== 76) issues.push('normalize should use last series point');
  const conf = getPlatformPredictionConfidence(norm);
  if (!conf.ok) issues.push('confidence query failed');
  if (!Object.keys(PLATFORM_PREDICTION_PUBLIC_MOUNTS).includes('getProjections')) {
    issues.push('missing getProjections mount');
  }
  return {
    valid: issues.length === 0,
    issues,
    phase: PRED_BASE_002_PHASE,
    registrySize: CERTIFIED_PREDICTION_REGISTRY.length
  };
}
