'use strict';

/**
 * AIOI-P3.8 — Métricas e infraestrutura READ ONLY da Governance Excellence Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_GOVERNANCE_EXCELLENCE_METRICS';

const MATURITY_THRESHOLDS = Object.freeze({ mature: 70, developing: 40 });
const CONSISTENCY_THRESHOLDS = Object.freeze({ consistent: 70, partial: 40 });
const COVERAGE_THRESHOLDS = Object.freeze({ comprehensive: 70, partial: 40 });
const EXCELLENCE_THRESHOLDS = Object.freeze({
  governance_excellent: 90,
  excellent:            70,
  developing:           40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  governanceExcellenceRequests:  0,
  governanceMaturity:            0,
  governanceConsistency:         0,
  governanceCoverage:            0,
  enterpriseGovernance:          0,
  errors:                        0,
  total_latency_ms:              0,
  latency_samples:               0
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

function recordGovernanceExcellenceRequested(companyId) {
  _sessionCounters.governanceExcellenceRequests++;
  console.info(`[${LAYER}] AIOI_GOVERNANCE_EXCELLENCE_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.governanceExcellenceRequests
  });
}

function recordGovernanceExcellenceCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_GOVERNANCE_EXCELLENCE_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.governanceExcellenceRequests
  });
}

function recordGovernanceMaturityAnalyzed(companyId) {
  _sessionCounters.governanceMaturity++;
  console.info(`[${LAYER}] AIOI_GOVERNANCE_MATURITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.governanceMaturity
  });
}

function recordGovernanceConsistencyAnalyzed(companyId) {
  _sessionCounters.governanceConsistency++;
  console.info(`[${LAYER}] AIOI_GOVERNANCE_CONSISTENCY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.governanceConsistency
  });
}

function recordGovernanceCoverageAnalyzed(companyId) {
  _sessionCounters.governanceCoverage++;
  console.info(`[${LAYER}] AIOI_GOVERNANCE_COVERAGE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.governanceCoverage
  });
}

function recordEnterpriseGovernanceAnalyzed(companyId) {
  _sessionCounters.enterpriseGovernance++;
  console.info(`[${LAYER}] AIOI_ENTERPRISE_GOVERNANCE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.enterpriseGovernance
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_GOVERNANCE_EXCELLENCE_ERROR`, {
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
    governance_excellence_requests:   _sessionCounters.governanceExcellenceRequests,
    governance_maturity_count:        _sessionCounters.governanceMaturity,
    governance_consistency_count:     _sessionCounters.governanceConsistency,
    governance_coverage_count:        _sessionCounters.governanceCoverage,
    enterprise_governance_count:      _sessionCounters.enterpriseGovernance,
    governance_excellence_error_count: _sessionCounters.errors,
    avg_query_latency_ms:             avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    governanceExcellenceRequests: 0, governanceMaturity: 0, governanceConsistency: 0,
    governanceCoverage: 0, enterpriseGovernance: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyGovernanceMaturity(score) {
  if (score >= MATURITY_THRESHOLDS.mature) return 'mature';
  if (score >= MATURITY_THRESHOLDS.developing) return 'developing';
  return 'immature';
}

function classifyGovernanceConsistency(score) {
  if (score >= CONSISTENCY_THRESHOLDS.consistent) return 'consistent';
  if (score >= CONSISTENCY_THRESHOLDS.partial) return 'partial';
  return 'inconsistent';
}

function classifyGovernanceCoverage(score) {
  if (score >= COVERAGE_THRESHOLDS.comprehensive) return 'comprehensive';
  if (score >= COVERAGE_THRESHOLDS.partial) return 'partial';
  return 'limited';
}

function classifyGovernanceExcellence(score) {
  if (score >= EXCELLENCE_THRESHOLDS.governance_excellent) return 'governance_excellent';
  if (score >= EXCELLENCE_THRESHOLDS.excellent) return 'excellent';
  if (score >= EXCELLENCE_THRESHOLDS.developing) return 'developing';
  return 'emerging';
}

function _extractGovernanceSignals(confRm) {
  const crm = confRm?.certification_read_model;
  const srm = crm?.sustainability_read_model;
  const vgrm = srm?.value_governance_read_model;
  const rrm = vgrm?.readiness_read_model;
  const arm = rrm?.auditability_read_model;
  const assuranceRm = arm?.assurance_read_model;

  return {
    trustScore:              assuranceRm?.trust_read_model?.intelligence_trust?.trust_score ?? null,
    assuranceScore:          assuranceRm?.intelligence_assurance?.assurance_score ?? null,
    auditabilityScore:       arm?.enterprise_auditability?.auditability_score ?? null,
    readinessScore:          rrm?.enterprise_scale_readiness?.enterprise_readiness_score ?? null,
    valueGovernanceScore:    vgrm?.enterprise_value_governance?.value_governance_score ?? null,
    sustainabilityScore:     srm?.enterprise_sustainability?.enterprise_sustainability_score ?? null,
    certificationScore:    crm?.enterprise_certification?.certification_score ?? null,
    conformanceScore:        confRm?.intelligence_conformance?.conformance_score ?? null,
    enterpriseConformanceScore: confRm?.enterprise_conformance?.enterprise_conformance_score ?? null
  };
}

module.exports = {
  MATURITY_THRESHOLDS,
  CONSISTENCY_THRESHOLDS,
  COVERAGE_THRESHOLDS,
  EXCELLENCE_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyGovernanceMaturity,
  classifyGovernanceConsistency,
  classifyGovernanceCoverage,
  classifyGovernanceExcellence,
  _extractGovernanceSignals,
  recordGovernanceExcellenceRequested,
  recordGovernanceExcellenceCompleted,
  recordGovernanceMaturityAnalyzed,
  recordGovernanceConsistencyAnalyzed,
  recordGovernanceCoverageAnalyzed,
  recordEnterpriseGovernanceAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
