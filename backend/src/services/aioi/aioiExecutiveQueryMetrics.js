'use strict';

/**
 * AIOI-P5.1 — Métricas e infraestrutura READ ONLY da Enterprise Executive Query Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_EXECUTIVE_QUERY_METRICS';

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  executiveQueryRequests:         0,
  executiveSummaryQueries:        0,
  strategicOverviewQueries:       0,
  decisionVisualizationQueries:   0,
  interfaceIntelligenceQueries:   0,
  errors:                         0,
  total_latency_ms:               0,
  latency_samples:                0
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

function recordExecutiveQueryRequested(companyId, queryType) {
  _sessionCounters.executiveQueryRequests++;
  console.info(`[${LAYER}] AIOI_EXECUTIVE_QUERY_REQUESTED`, {
    company_id: companyId,
    query_type: queryType || 'unknown',
    session_total: _sessionCounters.executiveQueryRequests
  });
}

function recordExecutiveQueryCompleted(companyId, queryType, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_EXECUTIVE_QUERY_COMPLETED`, {
    company_id: companyId,
    query_type: queryType || 'unknown',
    session_total: _sessionCounters.executiveQueryRequests
  });
}

function recordExecutiveSummaryQuery(companyId) {
  _sessionCounters.executiveSummaryQueries++;
}

function recordStrategicOverviewQuery(companyId) {
  _sessionCounters.strategicOverviewQueries++;
}

function recordDecisionVisualizationQuery(companyId) {
  _sessionCounters.decisionVisualizationQueries++;
}

function recordInterfaceIntelligenceQuery(companyId) {
  _sessionCounters.interfaceIntelligenceQueries++;
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
    executive_query_requests:           _sessionCounters.executiveQueryRequests,
    executive_summary_queries:          _sessionCounters.executiveSummaryQueries,
    strategic_overview_queries:         _sessionCounters.strategicOverviewQueries,
    decision_visualization_queries:     _sessionCounters.decisionVisualizationQueries,
    interface_intelligence_queries:     _sessionCounters.interfaceIntelligenceQueries,
    executive_query_error_count:        _sessionCounters.errors,
    avg_query_latency_ms:               avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    executiveQueryRequests: 0,
    executiveSummaryQueries: 0,
    strategicOverviewQueries: 0,
    decisionVisualizationQueries: 0,
    interfaceIntelligenceQueries: 0,
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
  recordExecutiveQueryRequested,
  recordExecutiveQueryCompleted,
  recordExecutiveSummaryQuery,
  recordStrategicOverviewQuery,
  recordDecisionVisualizationQuery,
  recordInterfaceIntelligenceQuery,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
