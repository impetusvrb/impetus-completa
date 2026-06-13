'use strict';

/**
 * AIOI-P1D.3 — Runtime Aggregation Service
 *
 * Cache interno + refresh periódico para observabilidade em escala.
 * Elimina COUNT(*) full-table em endpoints frequentes.
 *
 * ADDITIVE ONLY — não altera aioiRuntimeMetricsService.
 *
 * Config:
 *   IMPETUS_AIOI_AGGREGATION_REFRESH_MS=60000
 */

const db = require('../../../db');
const metricsMod = require('./aioiRuntimeMetricsService');

const LAYER = 'AIOI_RUNTIME_AGGREGATION';
const DEFAULT_REFRESH_MS = 60_000;

let _cache = null;
let _lastRefresh = 0;
let _refreshInProgress = false;
let _refreshTimer = null;

function _getRefreshMs() {
  const n = parseInt(String(process.env.IMPETUS_AIOI_AGGREGATION_REFRESH_MS || DEFAULT_REFRESH_MS), 10);
  return Math.min(Math.max(Number.isFinite(n) ? n : DEFAULT_REFRESH_MS, 10_000), 600_000);
}

/**
 * Agregação via índices parciais — sem full scan desnecessário.
 */
async function _fetchAggregatesFromDb() {
  const [outboxStatus, snapshotTotal, ioeStatus, tableSizes] = await Promise.all([
    db.query(`
      SELECT status, COUNT(*)::int AS n
      FROM aioi_outbox
      GROUP BY status
    `),
    db.query(`
      SELECT COUNT(*)::int AS total,
             COUNT(DISTINCT company_id)::int AS tenant_count
      FROM aioi_executive_queue_snapshot
    `),
    db.query(`
      SELECT status, COUNT(*)::int AS n
      FROM industrial_operational_events
      GROUP BY status
    `),
    db.query(`
      SELECT
        pg_total_relation_size('aioi_outbox'::regclass)::bigint AS outbox_bytes,
        pg_total_relation_size('aioi_executive_queue_snapshot'::regclass)::bigint AS snapshot_bytes,
        pg_total_relation_size('industrial_operational_events'::regclass)::bigint AS ioe_bytes
    `)
  ]);

  const outbox = { pending: 0, processing: 0, delivered: 0, failed: 0, dlq: 0 };
  for (const row of outboxStatus.rows) {
    if (Object.prototype.hasOwnProperty.call(outbox, row.status)) {
      outbox[row.status] = row.n;
    }
  }

  const ioe = {};
  for (const row of ioeStatus.rows) {
    ioe[row.status] = row.n;
  }

  const sizes = tableSizes.rows[0] || {};

  return {
    outbox,
    outbox_total: Object.values(outbox).reduce((a, b) => a + b, 0),
    snapshots_total: snapshotTotal.rows[0]?.total || 0,
    snapshot_tenant_count: snapshotTotal.rows[0]?.tenant_count || 0,
    ioe_by_status: ioe,
    ioe_total: Object.values(ioe).reduce((a, b) => a + b, 0),
    storage_bytes: {
      outbox: parseInt(sizes.outbox_bytes || 0, 10),
      snapshots: parseInt(sizes.snapshot_bytes || 0, 10),
      ioe: parseInt(sizes.ioe_bytes || 0, 10)
    },
    refreshed_at: new Date().toISOString()
  };
}

/**
 * Refresh do cache (incremental — merge com métricas in-process).
 */
async function refreshAggregateCache() {
  if (_refreshInProgress) return _cache;
  _refreshInProgress = true;
  try {
    const dbAgg = await _fetchAggregatesFromDb();
    const inProcess = metricsMod.getMetricsSummary();
    _cache = {
      ok: true,
      layer: LAYER,
      ...dbAgg,
      in_process: inProcess,
      refresh_interval_ms: _getRefreshMs()
    };
    _lastRefresh = Date.now();
    return _cache;
  } finally {
    _refreshInProgress = false;
  }
}

/**
 * Retorna agregados — usa cache se fresco, senão refresh.
 * @param {object} [opts]
 * @param {boolean} [opts.forceRefresh]
 * @returns {Promise<object>}
 */
async function getRuntimeAggregateMetrics({ forceRefresh = false } = {}) {
  const age = Date.now() - _lastRefresh;
  const stale = !_cache || age > _getRefreshMs();

  if (forceRefresh || stale) {
    await refreshAggregateCache();
  }

  return {
    ..._cache,
    cache_age_ms: Date.now() - _lastRefresh,
    cache_stale: stale
  };
}

/**
 * Inicia refresh periódico em background (opcional, server boot).
 */
function startPeriodicRefresh() {
  if (_refreshTimer) return;
  const interval = _getRefreshMs();
  _refreshTimer = setInterval(() => {
    refreshAggregateCache().catch(() => {});
  }, interval);
  if (typeof _refreshTimer.unref === 'function') _refreshTimer.unref();
}

function stopPeriodicRefresh() {
  if (_refreshTimer) {
    clearInterval(_refreshTimer);
    _refreshTimer = null;
  }
}

function getCacheStatus() {
  return {
    layer: LAYER,
    cached: !!_cache,
    last_refresh: _lastRefresh ? new Date(_lastRefresh).toISOString() : null,
    cache_age_ms: _lastRefresh ? Date.now() - _lastRefresh : null,
    refresh_interval_ms: _getRefreshMs()
  };
}

module.exports = {
  getRuntimeAggregateMetrics,
  refreshAggregateCache,
  startPeriodicRefresh,
  stopPeriodicRefresh,
  getCacheStatus,
  LAYER
};
