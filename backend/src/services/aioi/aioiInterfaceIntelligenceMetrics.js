'use strict';

/**
 * AIOI-P4.6 — Métricas e infraestrutura READ ONLY da Interface Intelligence Model Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_INTERFACE_INTELLIGENCE_METRICS';

const PERSPECTIVE_THRESHOLDS = Object.freeze({ interface_ready: 70, partial: 40 });
const CONSISTENCY_THRESHOLDS = Object.freeze({ consistent: 70, partial: 40 });
const COVERAGE_THRESHOLDS = Object.freeze({ comprehensive: 70, partial: 40 });
const ENTERPRISE_INTERFACE_THRESHOLDS = Object.freeze({
  interface_ready:            90,
  enterprise_interface_ready: 70,
  developing:                 40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  interfaceIntelligenceRequests:    0,
  interfacePerspective:             0,
  interfaceConsistency:             0,
  interfaceCoverage:                0,
  enterpriseInterfaceIntelligence:  0,
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

function recordInterfaceIntelligenceRequested(companyId) {
  _sessionCounters.interfaceIntelligenceRequests++;
  console.info(`[${LAYER}] AIOI_INTERFACE_INTELLIGENCE_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.interfaceIntelligenceRequests
  });
}

function recordInterfaceIntelligenceCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_INTERFACE_INTELLIGENCE_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.interfaceIntelligenceRequests
  });
}

function recordInterfacePerspectiveAnalyzed(companyId) {
  _sessionCounters.interfacePerspective++;
  console.info(`[${LAYER}] AIOI_INTERFACE_PERSPECTIVE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.interfacePerspective
  });
}

function recordInterfaceConsistencyAnalyzed(companyId) {
  _sessionCounters.interfaceConsistency++;
  console.info(`[${LAYER}] AIOI_INTERFACE_CONSISTENCY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.interfaceConsistency
  });
}

function recordInterfaceCoverageAnalyzed(companyId) {
  _sessionCounters.interfaceCoverage++;
  console.info(`[${LAYER}] AIOI_INTERFACE_COVERAGE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.interfaceCoverage
  });
}

function recordEnterpriseInterfaceIntelligenceAnalyzed(companyId) {
  _sessionCounters.enterpriseInterfaceIntelligence++;
  console.info(`[${LAYER}] AIOI_ENTERPRISE_INTERFACE_INTELLIGENCE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.enterpriseInterfaceIntelligence
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_INTERFACE_INTELLIGENCE_ERROR`, {
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
    interface_intelligence_requests:          _sessionCounters.interfaceIntelligenceRequests,
    interface_perspective_count:              _sessionCounters.interfacePerspective,
    interface_consistency_count:              _sessionCounters.interfaceConsistency,
    interface_coverage_count:                 _sessionCounters.interfaceCoverage,
    enterprise_interface_intelligence_count:  _sessionCounters.enterpriseInterfaceIntelligence,
    interface_intelligence_error_count:       _sessionCounters.errors,
    avg_query_latency_ms:                     avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    interfaceIntelligenceRequests: 0, interfacePerspective: 0, interfaceConsistency: 0,
    interfaceCoverage: 0, enterpriseInterfaceIntelligence: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyInterfacePerspective(score) {
  if (score >= PERSPECTIVE_THRESHOLDS.interface_ready) return 'interface_ready';
  if (score >= PERSPECTIVE_THRESHOLDS.partial) return 'partial';
  return 'fragmented';
}

function classifyInterfaceConsistency(score) {
  if (score >= CONSISTENCY_THRESHOLDS.consistent) return 'consistent';
  if (score >= CONSISTENCY_THRESHOLDS.partial) return 'partial';
  return 'inconsistent';
}

function classifyInterfaceCoverage(score) {
  if (score >= COVERAGE_THRESHOLDS.comprehensive) return 'comprehensive';
  if (score >= COVERAGE_THRESHOLDS.partial) return 'partial';
  return 'limited';
}

function classifyEnterpriseInterfaceIntelligence(score) {
  if (score >= ENTERPRISE_INTERFACE_THRESHOLDS.interface_ready) return 'interface_ready';
  if (score >= ENTERPRISE_INTERFACE_THRESHOLDS.enterprise_interface_ready) return 'enterprise_interface_ready';
  if (score >= ENTERPRISE_INTERFACE_THRESHOLDS.developing) return 'developing';
  return 'emerging';
}

function _extractInterfaceIntelligenceSignals(dvrm) {
  const ecrm = dvrm?.executive_cockpit_read_model;
  const vrm = ecrm?.visualization_read_model;
  const crm = vrm?.consumption_read_model;
  const arm = crm?.autonomy_read_model;
  const srm = arm?.sovereignty_read_model;
  const irm = srm?.institutionalization_read_model;
  const germ = irm?.governance_excellence_read_model;
  const confRm = germ?.conformance_read_model;
  const certRm = confRm?.certification_read_model;
  const srmNested = certRm?.sustainability_read_model;
  const vgrm = srmNested?.value_governance_read_model;
  const rrm = vgrm?.readiness_read_model;
  const auditRm = rrm?.auditability_read_model;
  const assuranceRm = auditRm?.assurance_read_model;

  return {
    decisionPerspectiveScore:           dvrm?.decision_perspective?.perspective_score ?? null,
    decisionConsistencyScore:           dvrm?.decision_consistency?.consistency_score ?? null,
    decisionVisualizationCoverageScore: dvrm?.decision_visualization_coverage?.coverage_score ?? null,
    enterpriseDecisionVisualizationScore: dvrm?.enterprise_decision_visualization?.visualization_score ?? null,
    executiveSummaryScore:            ecrm?.executive_summary?.summary_score ?? null,
    strategicOverviewScore:             ecrm?.strategic_overview?.overview_score ?? null,
    cockpitReadinessScore:              ecrm?.enterprise_cockpit_readiness?.cockpit_score ?? null,
    visualizationReadinessScore:        vrm?.enterprise_visualization_readiness?.visualization_score ?? null,
    visualizationCoverageScore:         vrm?.visualization_coverage?.coverage_score ?? null,
    trustScore:                         assuranceRm?.trust_read_model?.intelligence_trust?.trust_score ?? null,
    assuranceScore:                     assuranceRm?.intelligence_assurance?.assurance_score ?? null,
    auditabilityScore:                  auditRm?.enterprise_auditability?.auditability_score ?? null,
    readinessScore:                     rrm?.enterprise_scale_readiness?.enterprise_readiness_score ?? null,
    governanceExcellenceScore:          germ?.enterprise_governance_excellence?.governance_excellence_score ?? null,
    institutionalizationScore:          irm?.enterprise_institutionalization?.institutionalization_score ?? null,
    sovereigntyScore:                   srm?.enterprise_sovereignty?.sovereignty_score ?? null,
    autonomyScore:                      arm?.enterprise_autonomy?.autonomy_score ?? null,
    consumptionScore:                   crm?.enterprise_consumption?.consumption_score ?? null
  };
}

module.exports = {
  PERSPECTIVE_THRESHOLDS,
  CONSISTENCY_THRESHOLDS,
  COVERAGE_THRESHOLDS,
  ENTERPRISE_INTERFACE_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyInterfacePerspective,
  classifyInterfaceConsistency,
  classifyInterfaceCoverage,
  classifyEnterpriseInterfaceIntelligence,
  _extractInterfaceIntelligenceSignals,
  recordInterfaceIntelligenceRequested,
  recordInterfaceIntelligenceCompleted,
  recordInterfacePerspectiveAnalyzed,
  recordInterfaceConsistencyAnalyzed,
  recordInterfaceCoverageAnalyzed,
  recordEnterpriseInterfaceIntelligenceAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
