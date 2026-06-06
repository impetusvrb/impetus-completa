'use strict';

/**
 * AIOI-P3.9 — Métricas e infraestrutura READ ONLY da Institutionalization Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_INSTITUTIONALIZATION_METRICS';

const STABILITY_THRESHOLDS = Object.freeze({ stable: 70, developing: 40 });
const COVERAGE_THRESHOLDS = Object.freeze({ comprehensive: 70, partial: 40 });
const PERSISTENCE_THRESHOLDS = Object.freeze({ persistent: 70, partial: 40 });
const INSTITUTIONALIZATION_THRESHOLDS = Object.freeze({
  institutionalized: 90,
  established:       70,
  developing:        40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  institutionalizationRequests:     0,
  governanceStability:              0,
  institutionalizationCoverage:     0,
  governancePersistence:            0,
  enterpriseInstitutionalization:   0,
  errors:                           0,
  total_latency_ms:                 0,
  latency_samples:                  0
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

function recordInstitutionalizationRequested(companyId) {
  _sessionCounters.institutionalizationRequests++;
  console.info(`[${LAYER}] AIOI_INSTITUTIONALIZATION_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.institutionalizationRequests
  });
}

function recordInstitutionalizationCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_INSTITUTIONALIZATION_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.institutionalizationRequests
  });
}

function recordGovernanceStabilityAnalyzed(companyId) {
  _sessionCounters.governanceStability++;
  console.info(`[${LAYER}] AIOI_GOVERNANCE_STABILITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.governanceStability
  });
}

function recordInstitutionalizationCoverageAnalyzed(companyId) {
  _sessionCounters.institutionalizationCoverage++;
  console.info(`[${LAYER}] AIOI_INSTITUTIONALIZATION_COVERAGE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.institutionalizationCoverage
  });
}

function recordGovernancePersistenceAnalyzed(companyId) {
  _sessionCounters.governancePersistence++;
  console.info(`[${LAYER}] AIOI_GOVERNANCE_PERSISTENCE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.governancePersistence
  });
}

function recordEnterpriseInstitutionalizationAnalyzed(companyId) {
  _sessionCounters.enterpriseInstitutionalization++;
  console.info(`[${LAYER}] AIOI_ENTERPRISE_INSTITUTIONALIZATION_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.enterpriseInstitutionalization
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_INSTITUTIONALIZATION_ERROR`, {
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
    institutionalization_requests:            _sessionCounters.institutionalizationRequests,
    governance_stability_count:                 _sessionCounters.governanceStability,
    institutionalization_coverage_count:        _sessionCounters.institutionalizationCoverage,
    governance_persistence_count:               _sessionCounters.governancePersistence,
    enterprise_institutionalization_count:      _sessionCounters.enterpriseInstitutionalization,
    institutionalization_error_count:           _sessionCounters.errors,
    avg_query_latency_ms:                       avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    institutionalizationRequests: 0, governanceStability: 0, institutionalizationCoverage: 0,
    governancePersistence: 0, enterpriseInstitutionalization: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyGovernanceStability(score) {
  if (score >= STABILITY_THRESHOLDS.stable) return 'stable';
  if (score >= STABILITY_THRESHOLDS.developing) return 'developing';
  return 'unstable';
}

function classifyInstitutionalizationCoverage(score) {
  if (score >= COVERAGE_THRESHOLDS.comprehensive) return 'comprehensive';
  if (score >= COVERAGE_THRESHOLDS.partial) return 'partial';
  return 'limited';
}

function classifyGovernancePersistence(score) {
  if (score >= PERSISTENCE_THRESHOLDS.persistent) return 'persistent';
  if (score >= PERSISTENCE_THRESHOLDS.partial) return 'partial';
  return 'fragile';
}

function classifyEnterpriseInstitutionalization(score) {
  if (score >= INSTITUTIONALIZATION_THRESHOLDS.institutionalized) return 'institutionalized';
  if (score >= INSTITUTIONALIZATION_THRESHOLDS.established) return 'established';
  if (score >= INSTITUTIONALIZATION_THRESHOLDS.developing) return 'developing';
  return 'emerging';
}

function _extractInstitutionalizationSignals(germ) {
  const confRm = germ?.conformance_read_model;
  const crm = confRm?.certification_read_model;
  const srm = crm?.sustainability_read_model;
  const vgrm = srm?.value_governance_read_model;
  const rrm = vgrm?.readiness_read_model;
  const arm = rrm?.auditability_read_model;
  const assuranceRm = arm?.assurance_read_model;

  return {
    trustScore:                 assuranceRm?.trust_read_model?.intelligence_trust?.trust_score ?? null,
    assuranceScore:             assuranceRm?.intelligence_assurance?.assurance_score ?? null,
    auditabilityScore:          arm?.enterprise_auditability?.auditability_score ?? null,
    readinessScore:             rrm?.enterprise_scale_readiness?.enterprise_readiness_score ?? null,
    valueGovernanceScore:       vgrm?.enterprise_value_governance?.value_governance_score ?? null,
    sustainabilityScore:        srm?.enterprise_sustainability?.enterprise_sustainability_score ?? null,
    certificationScore:         crm?.enterprise_certification?.certification_score ?? null,
    conformanceScore:           confRm?.intelligence_conformance?.conformance_score ?? null,
    governanceExcellenceScore:  germ?.enterprise_governance_excellence?.governance_excellence_score ?? null
  };
}

module.exports = {
  STABILITY_THRESHOLDS,
  COVERAGE_THRESHOLDS,
  PERSISTENCE_THRESHOLDS,
  INSTITUTIONALIZATION_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyGovernanceStability,
  classifyInstitutionalizationCoverage,
  classifyGovernancePersistence,
  classifyEnterpriseInstitutionalization,
  _extractInstitutionalizationSignals,
  recordInstitutionalizationRequested,
  recordInstitutionalizationCompleted,
  recordGovernanceStabilityAnalyzed,
  recordInstitutionalizationCoverageAnalyzed,
  recordGovernancePersistenceAnalyzed,
  recordEnterpriseInstitutionalizationAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
