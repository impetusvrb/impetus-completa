'use strict';

/**
 * M1.4 — Analytics Observability
 */

const LAYER = 'ANALYTICS_OBSERVABILITY';

const _metrics = {
  kpis_recorded: 0,
  aggregations_completed: 0,
  trends_detected: 0,
  forecasts_generated: 0,
  threshold_breaches: 0,
  errors: 0,
  last_activity_at: null
};

function incrementMetric(metric) {
  if (_metrics[metric] != null) _metrics[metric]++;
  _metrics.last_activity_at = new Date().toISOString();
}

function incrementError() {
  _metrics.errors++;
}

function getMetricsSnapshot() {
  return { layer: LAYER, ...structuredClone(_metrics) };
}

function getHealthStatus() {
  return {
    ok: true,
    layer: LAYER,
    domain: 'analytics',
    status: 'FOUNDATION_READY',
    metrics: getMetricsSnapshot()
  };
}

module.exports = { LAYER, incrementMetric, incrementError, getMetricsSnapshot, getHealthStatus };
