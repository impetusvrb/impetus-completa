'use strict';

/**
 * AIOI-P2.3 — Métricas e infraestrutura READ ONLY da Maturity Intelligence Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_MATURITY_METRICS';

const BENCHMARK_CURRENT_DAYS = 30;
const VOLATILITY_STABLE_THRESHOLD = 0.15;

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

const MATURITY_WEIGHTS = Object.freeze({
  success_rate:           30,
  sla_compliance:         25,
  learning_completion:    20,
  governance_consistency: 15,
  backlog_health:         10
});

let _sessionCounters = {
  maturityRequests:       0,
  benchmarkAnalysis:      0,
  stabilityAnalysis:      0,
  consistencyAnalysis:    0,
  maturityAnalyzed:       0,
  errors:                 0,
  total_latency_ms:       0,
  latency_samples:        0
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

function recordMaturityRequested(companyId) {
  _sessionCounters.maturityRequests++;
  console.info(`[${LAYER}] AIOI_MATURITY_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.maturityRequests
  });
}

function recordMaturityCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_MATURITY_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.maturityRequests
  });
}

function recordMaturityAnalyzed(companyId) {
  _sessionCounters.maturityAnalyzed++;
  console.info(`[${LAYER}] AIOI_MATURITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.maturityAnalyzed
  });
}

function recordBenchmarkAnalyzed(companyId) {
  _sessionCounters.benchmarkAnalysis++;
  console.info(`[${LAYER}] AIOI_BENCHMARK_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.benchmarkAnalysis
  });
}

function recordStabilityAnalyzed(companyId) {
  _sessionCounters.stabilityAnalysis++;
  console.info(`[${LAYER}] AIOI_STABILITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.stabilityAnalysis
  });
}

function recordConsistencyAnalyzed(companyId) {
  _sessionCounters.consistencyAnalysis++;
  console.info(`[${LAYER}] AIOI_CONSISTENCY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.consistencyAnalysis
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_MATURITY_ERROR`, {
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
    maturity_requests:           _sessionCounters.maturityRequests,
    benchmark_analysis_count:    _sessionCounters.benchmarkAnalysis,
    stability_analysis_count:    _sessionCounters.stabilityAnalysis,
    consistency_analysis_count:  _sessionCounters.consistencyAnalysis,
    maturity_analyzed_count:     _sessionCounters.maturityAnalyzed,
    maturity_error_count:        _sessionCounters.errors,
    avg_query_latency_ms:        avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    maturityRequests: 0, benchmarkAnalysis: 0, stabilityAnalysis: 0,
    consistencyAnalysis: 0, maturityAnalyzed: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function parseSnapshotPayload(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

function roundVal(val, decimals = 2) {
  if (val == null || !Number.isFinite(Number(val))) return null;
  const f = Math.pow(10, decimals);
  return Math.round(Number(val) * f) / f;
}

function variationPct(current, historical) {
  if (current == null || historical == null) return null;
  const c = Number(current);
  const h = Number(historical);
  if (!Number.isFinite(c) || !Number.isFinite(h) || h === 0) return null;
  return roundVal(((c - h) / Math.abs(h)) * 100);
}

function coefficientOfVariation(values) {
  if (!values || values.length < 2) return 0;
  const nums = values.filter(v => Number.isFinite(Number(v))).map(Number);
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  if (mean === 0) return 0;
  const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length;
  return Math.sqrt(variance) / Math.abs(mean);
}

function avgFromRows(rows, extractor) {
  const vals = rows.map(extractor).filter(v => v != null && Number.isFinite(Number(v)));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + Number(b), 0) / vals.length;
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

module.exports = {
  BENCHMARK_CURRENT_DAYS,
  VOLATILITY_STABLE_THRESHOLD,
  MATURITY_WEIGHTS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  parseSnapshotPayload,
  roundVal,
  variationPct,
  coefficientOfVariation,
  avgFromRows,
  clampScore,
  recordMaturityRequested,
  recordMaturityCompleted,
  recordMaturityAnalyzed,
  recordBenchmarkAnalyzed,
  recordStabilityAnalyzed,
  recordConsistencyAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
