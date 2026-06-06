'use strict';

/**
 * AIOI-P2.8 — Métricas e infraestrutura READ ONLY da Digital Twin Intelligence Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_DIGITAL_TWIN_METRICS';

const CONSISTENCY_THRESHOLDS = Object.freeze({
  coherent:  70,
  attention: 40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  digitalTwinRequests:  0,
  operationalState:     0,
  futureState:          0,
  scenarioState:        0,
  twinConsistency:      0,
  errors:               0,
  total_latency_ms:     0,
  latency_samples:      0
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

function recordDigitalTwinRequested(companyId) {
  _sessionCounters.digitalTwinRequests++;
  console.info(`[${LAYER}] AIOI_DIGITAL_TWIN_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.digitalTwinRequests
  });
}

function recordDigitalTwinCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_DIGITAL_TWIN_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.digitalTwinRequests
  });
}

function recordOperationalStateAnalyzed(companyId) {
  _sessionCounters.operationalState++;
  console.info(`[${LAYER}] AIOI_OPERATIONAL_STATE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.operationalState
  });
}

function recordFutureStateAnalyzed(companyId) {
  _sessionCounters.futureState++;
  console.info(`[${LAYER}] AIOI_FUTURE_STATE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.futureState
  });
}

function recordScenarioStateAnalyzed(companyId) {
  _sessionCounters.scenarioState++;
  console.info(`[${LAYER}] AIOI_SCENARIO_STATE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.scenarioState
  });
}

function recordTwinConsistencyAnalyzed(companyId) {
  _sessionCounters.twinConsistency++;
  console.info(`[${LAYER}] AIOI_TWIN_CONSISTENCY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.twinConsistency
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_DIGITAL_TWIN_ERROR`, {
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
    digital_twin_requests:    _sessionCounters.digitalTwinRequests,
    operational_state_count:  _sessionCounters.operationalState,
    future_state_count:       _sessionCounters.futureState,
    scenario_state_count:     _sessionCounters.scenarioState,
    twin_consistency_count:   _sessionCounters.twinConsistency,
    digital_twin_error_count: _sessionCounters.errors,
    avg_query_latency_ms:     avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    digitalTwinRequests: 0, operationalState: 0, futureState: 0,
    scenarioState: 0, twinConsistency: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyConsistencyStatus(score) {
  if (score >= CONSISTENCY_THRESHOLDS.coherent) return 'coherent';
  if (score >= CONSISTENCY_THRESHOLDS.attention) return 'attention';
  return 'divergent';
}

function sumBacklogForecast(backlogForecast) {
  if (!backlogForecast) return 0;
  return (backlogForecast.approval_backlog_forecast || 0) +
    (backlogForecast.execution_backlog_forecast || 0) +
    (backlogForecast.outcome_backlog_forecast || 0) +
    (backlogForecast.learning_backlog_forecast || 0);
}

function relativeDelta(a, b) {
  const base = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / base;
}

module.exports = {
  CONSISTENCY_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyConsistencyStatus,
  sumBacklogForecast,
  relativeDelta,
  recordDigitalTwinRequested,
  recordDigitalTwinCompleted,
  recordOperationalStateAnalyzed,
  recordFutureStateAnalyzed,
  recordScenarioStateAnalyzed,
  recordTwinConsistencyAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
