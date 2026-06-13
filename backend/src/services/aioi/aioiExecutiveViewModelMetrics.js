'use strict';

/**
 * AIOI-P5.3 — Métricas e infraestrutura READ ONLY da Enterprise Executive View Model Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_EXECUTIVE_VIEW_MODEL_METRICS';

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  viewModelRequests:              0,
  executiveSummaryViewModels:     0,
  strategicOverviewViewModels:    0,
  decisionVisualizationViewModels: 0,
  interfaceIntelligenceViewModels: 0,
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

function recordViewModelRequested(companyId, viewType) {
  _sessionCounters.viewModelRequests++;
  console.info(`[${LAYER}] AIOI_VIEW_MODEL_REQUESTED`, {
    company_id: companyId,
    view_type: viewType || 'unknown',
    session_total: _sessionCounters.viewModelRequests
  });
}

function recordViewModelCompleted(companyId, viewType, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_VIEW_MODEL_COMPLETED`, {
    company_id: companyId,
    view_type: viewType || 'unknown',
    session_total: _sessionCounters.viewModelRequests
  });
}

function recordExecutiveSummaryViewModel(companyId) {
  _sessionCounters.executiveSummaryViewModels++;
}

function recordStrategicOverviewViewModel(companyId) {
  _sessionCounters.strategicOverviewViewModels++;
}

function recordDecisionVisualizationViewModel(companyId) {
  _sessionCounters.decisionVisualizationViewModels++;
}

function recordInterfaceIntelligenceViewModel(companyId) {
  _sessionCounters.interfaceIntelligenceViewModels++;
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_VIEW_MODEL_ERROR`, {
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
    view_model_requests:               _sessionCounters.viewModelRequests,
    executive_summary_view_models:     _sessionCounters.executiveSummaryViewModels,
    strategic_overview_view_models:    _sessionCounters.strategicOverviewViewModels,
    decision_visualization_view_models: _sessionCounters.decisionVisualizationViewModels,
    interface_intelligence_view_models: _sessionCounters.interfaceIntelligenceViewModels,
    view_model_error_count:            _sessionCounters.errors,
    avg_query_latency_ms:              avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    viewModelRequests: 0,
    executiveSummaryViewModels: 0,
    strategicOverviewViewModels: 0,
    decisionVisualizationViewModels: 0,
    interfaceIntelligenceViewModels: 0,
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
  recordViewModelRequested,
  recordViewModelCompleted,
  recordExecutiveSummaryViewModel,
  recordStrategicOverviewViewModel,
  recordDecisionVisualizationViewModel,
  recordInterfaceIntelligenceViewModel,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
