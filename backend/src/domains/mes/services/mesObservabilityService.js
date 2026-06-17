'use strict';

/**
 * M1.4 — MES Observability
 * Integração com audit trail, event backbone, metrics e health.
 */

const LAYER = 'MES_OBSERVABILITY';

const _metrics = {
  orders_created: 0,
  executions_recorded: 0,
  downtime_recorded: 0,
  scrap_recorded: 0,
  oee_snapshots: 0,
  traceability_registered: 0,
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
    domain: 'mes',
    status: 'FOUNDATION_READY',
    metrics: getMetricsSnapshot()
  };
}

module.exports = { LAYER, incrementMetric, incrementError, getMetricsSnapshot, getHealthStatus };
