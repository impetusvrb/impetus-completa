'use strict';

/**
 * AIOI-P5.0 — Métricas e infraestrutura READ ONLY da Enterprise Executive Cockpit API Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_COCKPIT_API_METRICS';

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  cockpitApiRequests:           0,
  cockpitSummaryRequests:       0,
  cockpitOverviewRequests:      0,
  cockpitInterfaceRequests:     0,
  cockpitVisualizationRequests: 0,
  errors:                       0,
  total_latency_ms:             0,
  latency_samples:              0
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

async function validateTenantRls(companyId) {
  return withTenantReadClient(companyId, async (client) => {
    await readQuery(client, 'SELECT 1 AS rls_validated');
    return { ok: true };
  });
}

function _recordLatency(ms) {
  if (typeof ms === 'number' && ms >= 0) {
    _sessionCounters.total_latency_ms += ms;
    _sessionCounters.latency_samples++;
  }
}

function recordCockpitApiRequested(companyId, endpoint) {
  _sessionCounters.cockpitApiRequests++;
  console.info(`[${LAYER}] AIOI_COCKPIT_API_REQUESTED`, {
    company_id: companyId,
    endpoint:   endpoint || 'unknown',
    session_total: _sessionCounters.cockpitApiRequests
  });
}

function recordCockpitApiCompleted(companyId, endpoint, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_COCKPIT_API_COMPLETED`, {
    company_id: companyId,
    endpoint:   endpoint || 'unknown',
    session_total: _sessionCounters.cockpitApiRequests
  });
}

function recordCockpitSummaryRequest(companyId) {
  _sessionCounters.cockpitSummaryRequests++;
}

function recordCockpitOverviewRequest(companyId) {
  _sessionCounters.cockpitOverviewRequests++;
}

function recordCockpitInterfaceRequest(companyId) {
  _sessionCounters.cockpitInterfaceRequests++;
}

function recordCockpitVisualizationRequest(companyId) {
  _sessionCounters.cockpitVisualizationRequests++;
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_COCKPIT_API_ERROR`, {
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
    cockpit_api_requests:            _sessionCounters.cockpitApiRequests,
    cockpit_summary_requests:        _sessionCounters.cockpitSummaryRequests,
    cockpit_overview_requests:       _sessionCounters.cockpitOverviewRequests,
    cockpit_interface_requests:      _sessionCounters.cockpitInterfaceRequests,
    cockpit_visualization_requests:  _sessionCounters.cockpitVisualizationRequests,
    cockpit_api_error_count:         _sessionCounters.errors,
    avg_query_latency_ms:            avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    cockpitApiRequests: 0,
    cockpitSummaryRequests: 0,
    cockpitOverviewRequests: 0,
    cockpitInterfaceRequests: 0,
    cockpitVisualizationRequests: 0,
    errors: 0,
    total_latency_ms: 0,
    latency_samples: 0
  };
}

module.exports = {
  LAYER,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  validateTenantRls,
  recordCockpitApiRequested,
  recordCockpitApiCompleted,
  recordCockpitSummaryRequest,
  recordCockpitOverviewRequest,
  recordCockpitInterfaceRequest,
  recordCockpitVisualizationRequest,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
