'use strict';

/**
 * AIOI-P3.6 — Métricas e infraestrutura READ ONLY da Certification Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_CERTIFICATION_METRICS';

const READINESS_THRESHOLDS = Object.freeze({ certification_ready: 70, partially_ready: 40 });
const COVERAGE_THRESHOLDS = Object.freeze({ comprehensive: 70, partial: 40 });
const MATURITY_THRESHOLDS = Object.freeze({
  level_5_certified:    90,
  level_4_trusted:      70,
  level_3_governed:     55,
  level_2_managed:      40
});
const ENTERPRISE_CERTIFICATION_THRESHOLDS = Object.freeze({
  enterprise_certified: 90,
  certifiable:            70,
  qualified:              40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  certificationRequests:        0,
  certificationReadiness:     0,
  accreditationCoverage:      0,
  maturityCertification:      0,
  enterpriseCertification:    0,
  errors:                     0,
  total_latency_ms:           0,
  latency_samples:            0
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

function recordCertificationRequested(companyId) {
  _sessionCounters.certificationRequests++;
  console.info(`[${LAYER}] AIOI_CERTIFICATION_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.certificationRequests
  });
}

function recordCertificationCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_CERTIFICATION_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.certificationRequests
  });
}

function recordCertificationReadinessAnalyzed(companyId) {
  _sessionCounters.certificationReadiness++;
  console.info(`[${LAYER}] AIOI_CERTIFICATION_READINESS_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.certificationReadiness
  });
}

function recordAccreditationCoverageAnalyzed(companyId) {
  _sessionCounters.accreditationCoverage++;
  console.info(`[${LAYER}] AIOI_ACCREDITATION_COVERAGE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.accreditationCoverage
  });
}

function recordMaturityCertificationAnalyzed(companyId) {
  _sessionCounters.maturityCertification++;
  console.info(`[${LAYER}] AIOI_MATURITY_CERTIFICATION_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.maturityCertification
  });
}

function recordEnterpriseCertificationAnalyzed(companyId) {
  _sessionCounters.enterpriseCertification++;
  console.info(`[${LAYER}] AIOI_ENTERPRISE_CERTIFICATION_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.enterpriseCertification
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_CERTIFICATION_ERROR`, {
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
    certification_requests:             _sessionCounters.certificationRequests,
    certification_readiness_count:      _sessionCounters.certificationReadiness,
    accreditation_coverage_count:       _sessionCounters.accreditationCoverage,
    maturity_certification_count:       _sessionCounters.maturityCertification,
    enterprise_certification_count:     _sessionCounters.enterpriseCertification,
    certification_error_count:          _sessionCounters.errors,
    avg_query_latency_ms:               avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    certificationRequests: 0, certificationReadiness: 0, accreditationCoverage: 0,
    maturityCertification: 0, enterpriseCertification: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyCertificationReadiness(score) {
  if (score >= READINESS_THRESHOLDS.certification_ready) return 'certification_ready';
  if (score >= READINESS_THRESHOLDS.partially_ready) return 'partially_ready';
  return 'not_ready';
}

function classifyCoverageStatus(score) {
  if (score >= COVERAGE_THRESHOLDS.comprehensive) return 'comprehensive';
  if (score >= COVERAGE_THRESHOLDS.partial) return 'partial';
  return 'limited';
}

function classifyMaturityLevel(score) {
  if (score >= MATURITY_THRESHOLDS.level_5_certified) return 'level_5_certified';
  if (score >= MATURITY_THRESHOLDS.level_4_trusted) return 'level_4_trusted';
  if (score >= MATURITY_THRESHOLDS.level_3_governed) return 'level_3_governed';
  if (score >= MATURITY_THRESHOLDS.level_2_managed) return 'level_2_managed';
  return 'level_1_foundational';
}

function classifyEnterpriseCertificationLevel(score) {
  if (score >= ENTERPRISE_CERTIFICATION_THRESHOLDS.enterprise_certified) return 'enterprise_certified';
  if (score >= ENTERPRISE_CERTIFICATION_THRESHOLDS.certifiable) return 'certifiable';
  if (score >= ENTERPRISE_CERTIFICATION_THRESHOLDS.qualified) return 'qualified';
  return 'emerging';
}

function _extractCertificationSignals(srm) {
  const vgrm = srm?.value_governance_read_model;
  const rrm = vgrm?.readiness_read_model;
  const arm = rrm?.auditability_read_model;
  const assuranceRm = arm?.assurance_read_model;

  return {
    trustScore:            assuranceRm?.trust_read_model?.intelligence_trust?.trust_score ?? null,
    assuranceScore:        assuranceRm?.intelligence_assurance?.assurance_score ?? null,
    auditabilityScore:     arm?.enterprise_auditability?.auditability_score ?? null,
    readinessScore:        rrm?.enterprise_scale_readiness?.enterprise_readiness_score ?? null,
    valueGovernanceScore:  vgrm?.enterprise_value_governance?.value_governance_score ?? null,
    sustainabilityScore:   srm?.enterprise_sustainability?.enterprise_sustainability_score ?? null,
    healthScore:           srm?.intelligence_health?.health_score ?? null,
    continuityScore:       srm?.governance_continuity?.continuity_score ?? null,
    valueSustainabilityScore: srm?.value_sustainability?.sustainability_score ?? null
  };
}

module.exports = {
  READINESS_THRESHOLDS,
  COVERAGE_THRESHOLDS,
  MATURITY_THRESHOLDS,
  ENTERPRISE_CERTIFICATION_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyCertificationReadiness,
  classifyCoverageStatus,
  classifyMaturityLevel,
  classifyEnterpriseCertificationLevel,
  _extractCertificationSignals,
  recordCertificationRequested,
  recordCertificationCompleted,
  recordCertificationReadinessAnalyzed,
  recordAccreditationCoverageAnalyzed,
  recordMaturityCertificationAnalyzed,
  recordEnterpriseCertificationAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
