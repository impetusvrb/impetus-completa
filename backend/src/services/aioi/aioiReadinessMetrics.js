'use strict';

/**
 * AIOI-P3.3 — Métricas e infraestrutura READ ONLY da Readiness & Adoption Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_READINESS_METRICS';

const STATUS_THRESHOLDS = Object.freeze({ high: 70, partial: 40 });
const ADOPTION_THRESHOLDS = Object.freeze({ high: 70, moderate: 40 });
const ENTERPRISE_READINESS_THRESHOLDS = Object.freeze({
  enterprise_ready: 90,
  advanced:         70,
  developing:       40
});
const GOVERNANCE_READINESS_THRESHOLDS = Object.freeze({
  enterprise_ready: 90,
  adequate:         70
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  readinessRequests:        0,
  adoptionAnalysis:         0,
  operationalReadiness:     0,
  governanceReadiness:      0,
  enterpriseReadiness:      0,
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

function recordReadinessRequested(companyId) {
  _sessionCounters.readinessRequests++;
  console.info(`[${LAYER}] AIOI_READINESS_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.readinessRequests
  });
}

function recordReadinessCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_READINESS_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.readinessRequests
  });
}

function recordAdoptionAnalyzed(companyId) {
  _sessionCounters.adoptionAnalysis++;
  console.info(`[${LAYER}] AIOI_ADOPTION_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.adoptionAnalysis
  });
}

function recordOperationalReadinessAnalyzed(companyId) {
  _sessionCounters.operationalReadiness++;
  console.info(`[${LAYER}] AIOI_OPERATIONAL_READINESS_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.operationalReadiness
  });
}

function recordGovernanceReadinessAnalyzed(companyId) {
  _sessionCounters.governanceReadiness++;
  console.info(`[${LAYER}] AIOI_GOVERNANCE_READINESS_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.governanceReadiness
  });
}

function recordEnterpriseReadinessAnalyzed(companyId) {
  _sessionCounters.enterpriseReadiness++;
  console.info(`[${LAYER}] AIOI_ENTERPRISE_READINESS_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.enterpriseReadiness
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_READINESS_ERROR`, {
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
    readiness_requests:             _sessionCounters.readinessRequests,
    adoption_analysis_count:        _sessionCounters.adoptionAnalysis,
    operational_readiness_count:    _sessionCounters.operationalReadiness,
    governance_readiness_count:     _sessionCounters.governanceReadiness,
    enterprise_readiness_count:     _sessionCounters.enterpriseReadiness,
    readiness_error_count:          _sessionCounters.errors,
    avg_query_latency_ms:           avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    readinessRequests: 0, adoptionAnalysis: 0, operationalReadiness: 0,
    governanceReadiness: 0, enterpriseReadiness: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyAdoptionStatus(score) {
  if (score >= ADOPTION_THRESHOLDS.high) return 'high_adoption';
  if (score >= ADOPTION_THRESHOLDS.moderate) return 'moderate_adoption';
  return 'low_adoption';
}

function classifyReadinessStatus(score) {
  if (score >= STATUS_THRESHOLDS.high) return 'ready';
  if (score >= STATUS_THRESHOLDS.partial) return 'partially_ready';
  return 'not_ready';
}

function classifyGovernanceReadinessStatus(score) {
  if (score >= GOVERNANCE_READINESS_THRESHOLDS.enterprise_ready) return 'enterprise_ready';
  if (score >= GOVERNANCE_READINESS_THRESHOLDS.adequate) return 'adequate';
  return 'insufficient';
}

function classifyEnterpriseReadinessLevel(score) {
  if (score >= ENTERPRISE_READINESS_THRESHOLDS.enterprise_ready) return 'enterprise_ready';
  if (score >= ENTERPRISE_READINESS_THRESHOLDS.advanced) return 'advanced';
  if (score >= ENTERPRISE_READINESS_THRESHOLDS.developing) return 'developing';
  return 'emerging';
}

module.exports = {
  STATUS_THRESHOLDS,
  ADOPTION_THRESHOLDS,
  ENTERPRISE_READINESS_THRESHOLDS,
  GOVERNANCE_READINESS_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyAdoptionStatus,
  classifyReadinessStatus,
  classifyGovernanceReadinessStatus,
  classifyEnterpriseReadinessLevel,
  recordReadinessRequested,
  recordReadinessCompleted,
  recordAdoptionAnalyzed,
  recordOperationalReadinessAnalyzed,
  recordGovernanceReadinessAnalyzed,
  recordEnterpriseReadinessAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
