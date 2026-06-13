'use strict';

/**
 * AIOI-P5.2 — Métricas e infraestrutura READ ONLY da Enterprise Executive UI Contract Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_UI_CONTRACT_METRICS';

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  uiContractRequests:             0,
  executiveSummaryContracts:      0,
  strategicOverviewContracts:     0,
  decisionVisualizationContracts: 0,
  interfaceIntelligenceContracts: 0,
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

function recordUiContractRequested(companyId, contractType) {
  _sessionCounters.uiContractRequests++;
  console.info(`[${LAYER}] AIOI_UI_CONTRACT_REQUESTED`, {
    company_id: companyId,
    contract_type: contractType || 'unknown',
    session_total: _sessionCounters.uiContractRequests
  });
}

function recordUiContractCompleted(companyId, contractType, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_UI_CONTRACT_COMPLETED`, {
    company_id: companyId,
    contract_type: contractType || 'unknown',
    session_total: _sessionCounters.uiContractRequests
  });
}

function recordExecutiveSummaryContract(companyId) {
  _sessionCounters.executiveSummaryContracts++;
}

function recordStrategicOverviewContract(companyId) {
  _sessionCounters.strategicOverviewContracts++;
}

function recordDecisionVisualizationContract(companyId) {
  _sessionCounters.decisionVisualizationContracts++;
}

function recordInterfaceIntelligenceContract(companyId) {
  _sessionCounters.interfaceIntelligenceContracts++;
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_UI_CONTRACT_ERROR`, {
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
    ui_contract_requests:              _sessionCounters.uiContractRequests,
    executive_summary_contracts:       _sessionCounters.executiveSummaryContracts,
    strategic_overview_contracts:      _sessionCounters.strategicOverviewContracts,
    decision_visualization_contracts:  _sessionCounters.decisionVisualizationContracts,
    interface_intelligence_contracts:  _sessionCounters.interfaceIntelligenceContracts,
    ui_contract_error_count:           _sessionCounters.errors,
    avg_query_latency_ms:              avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    uiContractRequests: 0,
    executiveSummaryContracts: 0,
    strategicOverviewContracts: 0,
    decisionVisualizationContracts: 0,
    interfaceIntelligenceContracts: 0,
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
  recordUiContractRequested,
  recordUiContractCompleted,
  recordExecutiveSummaryContract,
  recordStrategicOverviewContract,
  recordDecisionVisualizationContract,
  recordInterfaceIntelligenceContract,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
