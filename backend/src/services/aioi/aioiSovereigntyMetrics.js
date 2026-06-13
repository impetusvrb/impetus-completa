'use strict';

/**
 * AIOI-P4.0 — Métricas e infraestrutura READ ONLY da Sovereignty Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_SOVEREIGNTY_METRICS';

const INDEPENDENCE_THRESHOLDS = Object.freeze({ independent: 70, partially_independent: 40 });
const RESILIENCE_THRESHOLDS = Object.freeze({ resilient: 70, partial: 40 });
const COVERAGE_THRESHOLDS = Object.freeze({ comprehensive: 70, partial: 40 });
const SOVEREIGNTY_THRESHOLDS = Object.freeze({
  sovereign:                90,
  institutional_sovereign:  70,
  developing:               40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  sovereigntyRequests:          0,
  knowledgeIndependence:        0,
  institutionalResilience:      0,
  sovereigntyCoverage:          0,
  enterpriseSovereignty:        0,
  errors:                       0,
  total_latency_ms:             0,
  latency_samples:              0
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

function recordSovereigntyRequested(companyId) {
  _sessionCounters.sovereigntyRequests++;
  console.info(`[${LAYER}] AIOI_SOVEREIGNTY_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.sovereigntyRequests
  });
}

function recordSovereigntyCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_SOVEREIGNTY_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.sovereigntyRequests
  });
}

function recordKnowledgeIndependenceAnalyzed(companyId) {
  _sessionCounters.knowledgeIndependence++;
  console.info(`[${LAYER}] AIOI_KNOWLEDGE_INDEPENDENCE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.knowledgeIndependence
  });
}

function recordInstitutionalResilienceAnalyzed(companyId) {
  _sessionCounters.institutionalResilience++;
  console.info(`[${LAYER}] AIOI_INSTITUTIONAL_RESILIENCE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.institutionalResilience
  });
}

function recordSovereigntyCoverageAnalyzed(companyId) {
  _sessionCounters.sovereigntyCoverage++;
  console.info(`[${LAYER}] AIOI_SOVEREIGNTY_COVERAGE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.sovereigntyCoverage
  });
}

function recordEnterpriseSovereigntyAnalyzed(companyId) {
  _sessionCounters.enterpriseSovereignty++;
  console.info(`[${LAYER}] AIOI_ENTERPRISE_SOVEREIGNTY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.enterpriseSovereignty
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_SOVEREIGNTY_ERROR`, {
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
    sovereignty_requests:               _sessionCounters.sovereigntyRequests,
    knowledge_independence_count:         _sessionCounters.knowledgeIndependence,
    institutional_resilience_count:       _sessionCounters.institutionalResilience,
    sovereignty_coverage_count:           _sessionCounters.sovereigntyCoverage,
    enterprise_sovereignty_count:         _sessionCounters.enterpriseSovereignty,
    sovereignty_error_count:              _sessionCounters.errors,
    avg_query_latency_ms:                 avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    sovereigntyRequests: 0, knowledgeIndependence: 0, institutionalResilience: 0,
    sovereigntyCoverage: 0, enterpriseSovereignty: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyKnowledgeIndependence(score) {
  if (score >= INDEPENDENCE_THRESHOLDS.independent) return 'independent';
  if (score >= INDEPENDENCE_THRESHOLDS.partially_independent) return 'partially_independent';
  return 'dependent';
}

function classifyInstitutionalResilience(score) {
  if (score >= RESILIENCE_THRESHOLDS.resilient) return 'resilient';
  if (score >= RESILIENCE_THRESHOLDS.partial) return 'partial';
  return 'fragile';
}

function classifySovereigntyCoverage(score) {
  if (score >= COVERAGE_THRESHOLDS.comprehensive) return 'comprehensive';
  if (score >= COVERAGE_THRESHOLDS.partial) return 'partial';
  return 'limited';
}

function classifyEnterpriseSovereignty(score) {
  if (score >= SOVEREIGNTY_THRESHOLDS.sovereign) return 'sovereign';
  if (score >= SOVEREIGNTY_THRESHOLDS.institutional_sovereign) return 'institutional_sovereign';
  if (score >= SOVEREIGNTY_THRESHOLDS.developing) return 'developing';
  return 'emerging';
}

function _extractSovereigntySignals(irm) {
  const germ = irm?.governance_excellence_read_model;
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
    governanceExcellenceScore:  germ?.enterprise_governance_excellence?.governance_excellence_score ?? null,
    institutionalizationScore:  irm?.enterprise_institutionalization?.institutionalization_score ?? null
  };
}

module.exports = {
  INDEPENDENCE_THRESHOLDS,
  RESILIENCE_THRESHOLDS,
  COVERAGE_THRESHOLDS,
  SOVEREIGNTY_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyKnowledgeIndependence,
  classifyInstitutionalResilience,
  classifySovereigntyCoverage,
  classifyEnterpriseSovereignty,
  _extractSovereigntySignals,
  recordSovereigntyRequested,
  recordSovereigntyCompleted,
  recordKnowledgeIndependenceAnalyzed,
  recordInstitutionalResilienceAnalyzed,
  recordSovereigntyCoverageAnalyzed,
  recordEnterpriseSovereigntyAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
