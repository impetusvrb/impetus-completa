'use strict';

/**
 * M1.4 — Logistics Observability
 */

const LAYER = 'LOGISTICS_OBSERVABILITY';

const _metrics = {
  inventory_updates: 0,
  receipts_created: 0,
  shipments_created: 0,
  lots_registered: 0,
  stock_alerts: 0,
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
    domain: 'logistics',
    status: 'FOUNDATION_READY',
    metrics: getMetricsSnapshot()
  };
}

module.exports = { LAYER, incrementMetric, incrementError, getMetricsSnapshot, getHealthStatus };
