'use strict';

/**
 * AIOI-P2.1 — Métricas e infraestrutura READ ONLY da Governance Intelligence Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_GOVERNANCE_METRICS';

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  governanceRequests: 0,
  slaAnalysis:        0,
  riskAnalysis:       0,
  tenantHealth:       0,
  trendAnalysis:      0,
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

function recordGovernanceRequested(companyId) {
  _sessionCounters.governanceRequests++;
  console.info(`[${LAYER}] AIOI_GOVERNANCE_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.governanceRequests
  });
}

function recordGovernanceCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_GOVERNANCE_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.governanceRequests
  });
}

function recordSlaAnalyzed(companyId) {
  _sessionCounters.slaAnalysis++;
  console.info(`[${LAYER}] AIOI_SLA_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.slaAnalysis
  });
}

function recordRiskAnalyzed(companyId) {
  _sessionCounters.riskAnalysis++;
  console.info(`[${LAYER}] AIOI_RISK_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.riskAnalysis
  });
}

function recordTenantHealthCalculated(companyId) {
  _sessionCounters.tenantHealth++;
  console.info(`[${LAYER}] AIOI_TENANT_HEALTH_CALCULATED`, {
    company_id: companyId, session_total: _sessionCounters.tenantHealth
  });
}

function recordTrendAnalyzed(companyId) {
  _sessionCounters.trendAnalysis++;
  console.info(`[${LAYER}] AIOI_TREND_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.trendAnalysis
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_GOVERNANCE_ERROR`, {
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
    governance_requests:    _sessionCounters.governanceRequests,
    sla_analysis_count:     _sessionCounters.slaAnalysis,
    risk_analysis_count:    _sessionCounters.riskAnalysis,
    tenant_health_count:    _sessionCounters.tenantHealth,
    trend_analysis_count:   _sessionCounters.trendAnalysis,
    governance_error_count: _sessionCounters.errors,
    avg_query_latency_ms:   avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    governanceRequests: 0, slaAnalysis: 0, riskAnalysis: 0,
    tenantHealth: 0, trendAnalysis: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
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
  recordGovernanceRequested,
  recordGovernanceCompleted,
  recordSlaAnalyzed,
  recordRiskAnalyzed,
  recordTenantHealthCalculated,
  recordTrendAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
