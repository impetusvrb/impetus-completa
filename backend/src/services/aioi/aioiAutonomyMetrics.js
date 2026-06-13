'use strict';

/**
 * AIOI-P4.1 — Métricas e infraestrutura READ ONLY da Autonomy Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_AUTONOMY_METRICS';

const KNOWLEDGE_AUTONOMY_THRESHOLDS = Object.freeze({ autonomous: 70, developing: 40 });
const CONTINUITY_THRESHOLDS = Object.freeze({ continuous: 70, partial: 40 });
const COVERAGE_THRESHOLDS = Object.freeze({ comprehensive: 70, partial: 40 });
const ENTERPRISE_AUTONOMY_THRESHOLDS = Object.freeze({
  autonomous_enterprise: 90,
  sovereign_autonomous:  70,
  developing:            40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  autonomyRequests:         0,
  knowledgeAutonomy:        0,
  sovereigntyContinuity:    0,
  autonomyCoverage:         0,
  enterpriseAutonomy:       0,
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

function recordAutonomyRequested(companyId) {
  _sessionCounters.autonomyRequests++;
  console.info(`[${LAYER}] AIOI_AUTONOMY_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.autonomyRequests
  });
}

function recordAutonomyCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_AUTONOMY_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.autonomyRequests
  });
}

function recordKnowledgeAutonomyAnalyzed(companyId) {
  _sessionCounters.knowledgeAutonomy++;
  console.info(`[${LAYER}] AIOI_KNOWLEDGE_AUTONOMY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.knowledgeAutonomy
  });
}

function recordSovereigntyContinuityAnalyzed(companyId) {
  _sessionCounters.sovereigntyContinuity++;
  console.info(`[${LAYER}] AIOI_SOVEREIGNTY_CONTINUITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.sovereigntyContinuity
  });
}

function recordAutonomyCoverageAnalyzed(companyId) {
  _sessionCounters.autonomyCoverage++;
  console.info(`[${LAYER}] AIOI_AUTONOMY_COVERAGE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.autonomyCoverage
  });
}

function recordEnterpriseAutonomyAnalyzed(companyId) {
  _sessionCounters.enterpriseAutonomy++;
  console.info(`[${LAYER}] AIOI_ENTERPRISE_AUTONOMY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.enterpriseAutonomy
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_AUTONOMY_ERROR`, {
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
    autonomy_requests:              _sessionCounters.autonomyRequests,
    knowledge_autonomy_count:         _sessionCounters.knowledgeAutonomy,
    sovereignty_continuity_count:     _sessionCounters.sovereigntyContinuity,
    autonomy_coverage_count:          _sessionCounters.autonomyCoverage,
    enterprise_autonomy_count:        _sessionCounters.enterpriseAutonomy,
    autonomy_error_count:             _sessionCounters.errors,
    avg_query_latency_ms:             avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    autonomyRequests: 0, knowledgeAutonomy: 0, sovereigntyContinuity: 0,
    autonomyCoverage: 0, enterpriseAutonomy: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyKnowledgeAutonomy(score) {
  if (score >= KNOWLEDGE_AUTONOMY_THRESHOLDS.autonomous) return 'autonomous';
  if (score >= KNOWLEDGE_AUTONOMY_THRESHOLDS.developing) return 'developing';
  return 'dependent';
}

function classifySovereigntyContinuity(score) {
  if (score >= CONTINUITY_THRESHOLDS.continuous) return 'continuous';
  if (score >= CONTINUITY_THRESHOLDS.partial) return 'partial';
  return 'broken';
}

function classifyAutonomyCoverage(score) {
  if (score >= COVERAGE_THRESHOLDS.comprehensive) return 'comprehensive';
  if (score >= COVERAGE_THRESHOLDS.partial) return 'partial';
  return 'limited';
}

function classifyEnterpriseAutonomy(score) {
  if (score >= ENTERPRISE_AUTONOMY_THRESHOLDS.autonomous_enterprise) return 'autonomous_enterprise';
  if (score >= ENTERPRISE_AUTONOMY_THRESHOLDS.sovereign_autonomous) return 'sovereign_autonomous';
  if (score >= ENTERPRISE_AUTONOMY_THRESHOLDS.developing) return 'developing';
  return 'emerging';
}

function _extractAutonomySignals(srm) {
  const irm = srm?.institutionalization_read_model;
  const germ = irm?.governance_excellence_read_model;
  const confRm = germ?.conformance_read_model;
  const crm = confRm?.certification_read_model;
  const srmNested = crm?.sustainability_read_model;
  const vgrm = srmNested?.value_governance_read_model;
  const rrm = vgrm?.readiness_read_model;
  const arm = rrm?.auditability_read_model;
  const assuranceRm = arm?.assurance_read_model;

  return {
    trustScore:                 assuranceRm?.trust_read_model?.intelligence_trust?.trust_score ?? null,
    assuranceScore:             assuranceRm?.intelligence_assurance?.assurance_score ?? null,
    auditabilityScore:          arm?.enterprise_auditability?.auditability_score ?? null,
    readinessScore:             rrm?.enterprise_scale_readiness?.enterprise_readiness_score ?? null,
    valueGovernanceScore:       vgrm?.enterprise_value_governance?.value_governance_score ?? null,
    sustainabilityScore:        srmNested?.enterprise_sustainability?.enterprise_sustainability_score ?? null,
    certificationScore:         crm?.enterprise_certification?.certification_score ?? null,
    conformanceScore:           confRm?.intelligence_conformance?.conformance_score ?? null,
    governanceExcellenceScore:  germ?.enterprise_governance_excellence?.governance_excellence_score ?? null,
    institutionalizationScore:  irm?.enterprise_institutionalization?.institutionalization_score ?? null,
    sovereigntyScore:           srm?.enterprise_sovereignty?.sovereignty_score ?? null
  };
}

module.exports = {
  KNOWLEDGE_AUTONOMY_THRESHOLDS,
  CONTINUITY_THRESHOLDS,
  COVERAGE_THRESHOLDS,
  ENTERPRISE_AUTONOMY_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyKnowledgeAutonomy,
  classifySovereigntyContinuity,
  classifyAutonomyCoverage,
  classifyEnterpriseAutonomy,
  _extractAutonomySignals,
  recordAutonomyRequested,
  recordAutonomyCompleted,
  recordKnowledgeAutonomyAnalyzed,
  recordSovereigntyContinuityAnalyzed,
  recordAutonomyCoverageAnalyzed,
  recordEnterpriseAutonomyAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
