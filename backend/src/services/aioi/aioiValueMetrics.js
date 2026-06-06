'use strict';

/**
 * AIOI-P2.5 — Métricas e infraestrutura READ ONLY da Value Realization Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_VALUE_METRICS';

const VALUE_STATUS_THRESHOLDS = Object.freeze({
  high_value:   70,
  medium_value: 40
});

const RISK_RANK = Object.freeze({ low: 1, medium: 2, high: 3, critical: 4 });

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  valueRequests:        0,
  operationalValue:     0,
  riskImpact:           0,
  bottleneckCost:       0,
  portfolioAnalysis:    0,
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

function recordValueRequested(companyId) {
  _sessionCounters.valueRequests++;
  console.info(`[${LAYER}] AIOI_VALUE_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.valueRequests
  });
}

function recordValueCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_VALUE_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.valueRequests
  });
}

function recordOperationalValueAnalyzed(companyId) {
  _sessionCounters.operationalValue++;
  console.info(`[${LAYER}] AIOI_OPERATIONAL_VALUE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.operationalValue
  });
}

function recordRiskImpactAnalyzed(companyId) {
  _sessionCounters.riskImpact++;
  console.info(`[${LAYER}] AIOI_RISK_IMPACT_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.riskImpact
  });
}

function recordBottleneckCostAnalyzed(companyId) {
  _sessionCounters.bottleneckCost++;
  console.info(`[${LAYER}] AIOI_BOTTLENECK_COST_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.bottleneckCost
  });
}

function recordPortfolioAnalyzed(companyId) {
  _sessionCounters.portfolioAnalysis++;
  console.info(`[${LAYER}] AIOI_PORTFOLIO_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.portfolioAnalysis
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_VALUE_ERROR`, {
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
    value_requests:              _sessionCounters.valueRequests,
    operational_value_count:     _sessionCounters.operationalValue,
    risk_impact_count:           _sessionCounters.riskImpact,
    bottleneck_cost_count:       _sessionCounters.bottleneckCost,
    portfolio_analysis_count:    _sessionCounters.portfolioAnalysis,
    value_error_count:           _sessionCounters.errors,
    avg_query_latency_ms:        avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    valueRequests: 0, operationalValue: 0, riskImpact: 0,
    bottleneckCost: 0, portfolioAnalysis: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampIndex(val) {
  return Math.max(0, Math.min(100, Math.round(val)));
}

function classifyValueStatus(score) {
  if (score >= VALUE_STATUS_THRESHOLDS.high_value) return 'high_value';
  if (score >= VALUE_STATUS_THRESHOLDS.medium_value) return 'medium_value';
  return 'low_value';
}

function riskRank(level) {
  return RISK_RANK[level] || 1;
}

module.exports = {
  VALUE_STATUS_THRESHOLDS,
  RISK_RANK,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampIndex,
  classifyValueStatus,
  riskRank,
  recordValueRequested,
  recordValueCompleted,
  recordOperationalValueAnalyzed,
  recordRiskImpactAnalyzed,
  recordBottleneckCostAnalyzed,
  recordPortfolioAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
