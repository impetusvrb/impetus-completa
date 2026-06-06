'use strict';

/**
 * AIOI-P3.7 — Métricas e infraestrutura READ ONLY da Conformance Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_CONFORMANCE_METRICS';

const CONFORMANCE_THRESHOLDS = Object.freeze({ conformant: 70, partially_conformant: 40 });
const STANDARDS_COVERAGE_THRESHOLDS = Object.freeze({ complete: 70, partial: 40 });
const CONTINUITY_THRESHOLDS = Object.freeze({ continuous: 70, partial: 40 });
const ENTERPRISE_CONFORMANCE_THRESHOLDS = Object.freeze({
  enterprise_conformant: 90,
  conformant:            70,
  developing:            40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  conformanceRequests:       0,
  conformanceAnalysis:       0,
  standardsCoverage:         0,
  continuityAnalysis:        0,
  enterpriseConformance:     0,
  errors:                    0,
  total_latency_ms:          0,
  latency_samples:           0
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

function recordConformanceRequested(companyId) {
  _sessionCounters.conformanceRequests++;
  console.info(`[${LAYER}] AIOI_CONFORMANCE_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.conformanceRequests
  });
}

function recordConformanceCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_CONFORMANCE_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.conformanceRequests
  });
}

function recordConformanceAnalyzed(companyId) {
  _sessionCounters.conformanceAnalysis++;
  console.info(`[${LAYER}] AIOI_CONFORMANCE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.conformanceAnalysis
  });
}

function recordStandardsCoverageAnalyzed(companyId) {
  _sessionCounters.standardsCoverage++;
  console.info(`[${LAYER}] AIOI_STANDARDS_COVERAGE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.standardsCoverage
  });
}

function recordCertificationContinuityAnalyzed(companyId) {
  _sessionCounters.continuityAnalysis++;
  console.info(`[${LAYER}] AIOI_CERTIFICATION_CONTINUITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.continuityAnalysis
  });
}

function recordEnterpriseConformanceAnalyzed(companyId) {
  _sessionCounters.enterpriseConformance++;
  console.info(`[${LAYER}] AIOI_ENTERPRISE_CONFORMANCE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.enterpriseConformance
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_CONFORMANCE_ERROR`, {
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
    conformance_requests:           _sessionCounters.conformanceRequests,
    conformance_analysis_count:       _sessionCounters.conformanceAnalysis,
    standards_coverage_count:         _sessionCounters.standardsCoverage,
    continuity_analysis_count:        _sessionCounters.continuityAnalysis,
    enterprise_conformance_count:     _sessionCounters.enterpriseConformance,
    conformance_error_count:          _sessionCounters.errors,
    avg_query_latency_ms:             avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    conformanceRequests: 0, conformanceAnalysis: 0, standardsCoverage: 0,
    continuityAnalysis: 0, enterpriseConformance: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyConformanceStatus(score) {
  if (score >= CONFORMANCE_THRESHOLDS.conformant) return 'conformant';
  if (score >= CONFORMANCE_THRESHOLDS.partially_conformant) return 'partially_conformant';
  return 'non_conformant';
}

function classifyCoverageStatus(score) {
  if (score >= STANDARDS_COVERAGE_THRESHOLDS.complete) return 'complete';
  if (score >= STANDARDS_COVERAGE_THRESHOLDS.partial) return 'partial';
  return 'limited';
}

function classifyContinuityStatus(score) {
  if (score >= CONTINUITY_THRESHOLDS.continuous) return 'continuous';
  if (score >= CONTINUITY_THRESHOLDS.partial) return 'partial';
  return 'broken';
}

function classifyEnterpriseConformanceLevel(score) {
  if (score >= ENTERPRISE_CONFORMANCE_THRESHOLDS.enterprise_conformant) return 'enterprise_conformant';
  if (score >= ENTERPRISE_CONFORMANCE_THRESHOLDS.conformant) return 'conformant';
  if (score >= ENTERPRISE_CONFORMANCE_THRESHOLDS.developing) return 'developing';
  return 'emerging';
}

function _extractConformanceSignals(crm) {
  const srm = crm?.sustainability_read_model;
  const vgrm = srm?.value_governance_read_model;
  const rrm = vgrm?.readiness_read_model;
  const arm = rrm?.auditability_read_model;
  const assuranceRm = arm?.assurance_read_model;

  return {
    trustScore:           assuranceRm?.trust_read_model?.intelligence_trust?.trust_score ?? null,
    assuranceScore:       assuranceRm?.intelligence_assurance?.assurance_score ?? null,
    auditabilityScore:    arm?.enterprise_auditability?.auditability_score ?? null,
    readinessScore:       rrm?.enterprise_scale_readiness?.enterprise_readiness_score ?? null,
    valueGovernanceScore: vgrm?.enterprise_value_governance?.value_governance_score ?? null,
    sustainabilityScore:  srm?.enterprise_sustainability?.enterprise_sustainability_score ?? null,
    certificationScore:   crm?.enterprise_certification?.certification_score ?? null,
    enterpriseCertificationScore: crm?.enterprise_certification?.certification_score ?? null
  };
}

module.exports = {
  CONFORMANCE_THRESHOLDS,
  STANDARDS_COVERAGE_THRESHOLDS,
  CONTINUITY_THRESHOLDS,
  ENTERPRISE_CONFORMANCE_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyConformanceStatus,
  classifyCoverageStatus,
  classifyContinuityStatus,
  classifyEnterpriseConformanceLevel,
  _extractConformanceSignals,
  recordConformanceRequested,
  recordConformanceCompleted,
  recordConformanceAnalyzed,
  recordStandardsCoverageAnalyzed,
  recordCertificationContinuityAnalyzed,
  recordEnterpriseConformanceAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
