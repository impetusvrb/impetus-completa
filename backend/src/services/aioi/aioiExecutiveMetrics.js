'use strict';

/**
 * AIOI-P2.0 — Métricas e infraestrutura READ ONLY da Executive Intelligence Layer
 *
 * Logs estruturados + guard de SQL read-only compartilhado.
 */

const db = require('../../db');

const LAYER = 'AIOI_EXECUTIVE_METRICS';

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP'
]);

let _sessionCounters = {
  snapshotRequests:   0,
  operationalViews:   0,
  bottleneckAnalysis: 0,
  cycleAnalytics:     0,
  errors:             0,
  total_latency_ms:   0,
  latency_samples:    0
};

function assertReadOnlySql(sql) {
  const normalized = sql.trim().toUpperCase();
  for (const kw of FORBIDDEN_SQL) {
    if (normalized.startsWith(kw) || normalized.includes(` ${kw} `)) {
      throw new Error('READ_ONLY_LAYER_VIOLATION');
    }
  }
  if (normalized.includes('ON CONFLICT')) {
    throw new Error('READ_ONLY_LAYER_VIOLATION');
  }
}

async function withTenantReadClient(companyId, fn) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function readQuery(client, sql, params) {
  assertReadOnlySql(sql);
  return client.query(sql, params);
}

function _recordLatency(ms) {
  if (typeof ms === 'number' && ms >= 0) {
    _sessionCounters.total_latency_ms += ms;
    _sessionCounters.latency_samples++;
  }
}

function recordSnapshotRequested(companyId, latencyMs) {
  _sessionCounters.snapshotRequests++;
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_EXECUTIVE_SNAPSHOT_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.snapshotRequests
  });
}

function recordOperationalViewRequested(companyId, latencyMs) {
  _sessionCounters.operationalViews++;
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_OPERATIONAL_VIEW_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.operationalViews
  });
}

function recordBottleneckAnalysisRequested(companyId, latencyMs) {
  _sessionCounters.bottleneckAnalysis++;
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_BOTTLENECK_ANALYSIS_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.bottleneckAnalysis
  });
}

function recordCycleAnalyticsRequested(companyId, latencyMs) {
  _sessionCounters.cycleAnalytics++;
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_CYCLE_ANALYTICS_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.cycleAnalytics
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_EXECUTIVE_QUERY_ERROR`, {
    company_id: companyId,
    context:    context ? String(context).slice(0, 100) : 'unknown',
    error:      error ? String(error).slice(0, 200) : 'unknown',
    session_total: _sessionCounters.errors
  });
}

function getSessionCounters() {
  const avg = _sessionCounters.latency_samples > 0
    ? Math.round(_sessionCounters.total_latency_ms / _sessionCounters.latency_samples)
    : null;
  return {
    executive_snapshot_requests:   _sessionCounters.snapshotRequests,
    operational_view_requests:   _sessionCounters.operationalViews,
    bottleneck_analysis_requests:_sessionCounters.bottleneckAnalysis,
    cycle_analytics_requests:    _sessionCounters.cycleAnalytics,
    executive_query_errors:      _sessionCounters.errors,
    avg_query_latency_ms:        avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    snapshotRequests: 0, operationalViews: 0, bottleneckAnalysis: 0,
    cycleAnalytics: 0, errors: 0, total_latency_ms: 0, latency_samples: 0
  };
}

function roundMs(val) {
  if (val == null || !Number.isFinite(Number(val))) return null;
  return Math.round(Number(val));
}

module.exports = {
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  roundMs,
  recordSnapshotRequested,
  recordOperationalViewRequested,
  recordBottleneckAnalysisRequested,
  recordCycleAnalyticsRequested,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
