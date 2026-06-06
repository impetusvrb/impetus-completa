'use strict';

/**
 * AIOI-P3.4 — Métricas e infraestrutura READ ONLY da Value Governance Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_VALUE_GOVERNANCE_METRICS';

const STATUS_THRESHOLDS = Object.freeze({ high: 70, partial: 40 });
const UTILIZATION_THRESHOLDS = Object.freeze({ high: 70, moderate: 40 });
const VALUE_GOVERNANCE_THRESHOLDS = Object.freeze({
  value_governed: 90,
  advanced:       70,
  developing:     40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  valueGovernanceRequests:  0,
  utilizationAnalysis:      0,
  outcomeAlignment:         0,
  valueCoverage:            0,
  valueGovernanceAnalysis:  0,
  errors:                   0,
  total_latency_ms:         0,
  latency_samples:          0
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

function recordValueGovernanceRequested(companyId) {
  _sessionCounters.valueGovernanceRequests++;
  console.info(`[${LAYER}] AIOI_VALUE_GOVERNANCE_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.valueGovernanceRequests
  });
}

function recordValueGovernanceCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_VALUE_GOVERNANCE_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.valueGovernanceRequests
  });
}

function recordUtilizationAnalyzed(companyId) {
  _sessionCounters.utilizationAnalysis++;
  console.info(`[${LAYER}] AIOI_UTILIZATION_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.utilizationAnalysis
  });
}

function recordOutcomeAlignmentAnalyzed(companyId) {
  _sessionCounters.outcomeAlignment++;
  console.info(`[${LAYER}] AIOI_OUTCOME_ALIGNMENT_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.outcomeAlignment
  });
}

function recordValueCoverageAnalyzed(companyId) {
  _sessionCounters.valueCoverage++;
  console.info(`[${LAYER}] AIOI_VALUE_COVERAGE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.valueCoverage
  });
}

function recordValueGovernanceAnalyzed(companyId) {
  _sessionCounters.valueGovernanceAnalysis++;
  console.info(`[${LAYER}] AIOI_VALUE_GOVERNANCE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.valueGovernanceAnalysis
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_VALUE_GOVERNANCE_ERROR`, {
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
    value_governance_requests:    _sessionCounters.valueGovernanceRequests,
    utilization_analysis_count:   _sessionCounters.utilizationAnalysis,
    outcome_alignment_count:      _sessionCounters.outcomeAlignment,
    value_coverage_count:         _sessionCounters.valueCoverage,
    value_governance_count:       _sessionCounters.valueGovernanceAnalysis,
    value_governance_error_count: _sessionCounters.errors,
    avg_query_latency_ms:         avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    valueGovernanceRequests: 0, utilizationAnalysis: 0, outcomeAlignment: 0,
    valueCoverage: 0, valueGovernanceAnalysis: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyUtilizationStatus(score) {
  if (score >= UTILIZATION_THRESHOLDS.high) return 'high_utilization';
  if (score >= UTILIZATION_THRESHOLDS.moderate) return 'moderate_utilization';
  return 'low_utilization';
}

function classifyAlignmentStatus(score) {
  if (score >= STATUS_THRESHOLDS.high) return 'aligned';
  if (score >= STATUS_THRESHOLDS.partial) return 'partially_aligned';
  return 'misaligned';
}

function classifyCoverageStatus(score) {
  if (score >= STATUS_THRESHOLDS.high) return 'comprehensive';
  if (score >= STATUS_THRESHOLDS.partial) return 'partial';
  return 'limited';
}

function classifyValueGovernanceLevel(score) {
  if (score >= VALUE_GOVERNANCE_THRESHOLDS.value_governed) return 'value_governed';
  if (score >= VALUE_GOVERNANCE_THRESHOLDS.advanced) return 'advanced';
  if (score >= VALUE_GOVERNANCE_THRESHOLDS.developing) return 'developing';
  return 'emerging';
}

module.exports = {
  STATUS_THRESHOLDS,
  UTILIZATION_THRESHOLDS,
  VALUE_GOVERNANCE_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyUtilizationStatus,
  classifyAlignmentStatus,
  classifyCoverageStatus,
  classifyValueGovernanceLevel,
  recordValueGovernanceRequested,
  recordValueGovernanceCompleted,
  recordUtilizationAnalyzed,
  recordOutcomeAlignmentAnalyzed,
  recordValueCoverageAnalyzed,
  recordValueGovernanceAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
