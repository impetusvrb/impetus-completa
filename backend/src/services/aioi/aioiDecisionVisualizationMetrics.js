'use strict';

/**
 * AIOI-P4.5 — Métricas e infraestrutura READ ONLY da Decision Visualization Model Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_DECISION_VISUALIZATION_METRICS';

const PERSPECTIVE_THRESHOLDS = Object.freeze({ decision_ready: 70, partial: 40 });
const CONSISTENCY_THRESHOLDS = Object.freeze({ consistent: 70, partial: 40 });
const COVERAGE_THRESHOLDS = Object.freeze({ comprehensive: 70, partial: 40 });
const ENTERPRISE_DECISION_VISUALIZATION_THRESHOLDS = Object.freeze({
  visualization_ready:            90,
  executive_visualization_ready:  70,
  developing:                     40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  decisionVisualizationRequests:    0,
  decisionPerspective:                0,
  decisionConsistency:                0,
  decisionVisualizationCoverage:      0,
  enterpriseDecisionVisualization:    0,
  errors:                             0,
  total_latency_ms:                   0,
  latency_samples:                    0
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

function recordDecisionVisualizationRequested(companyId) {
  _sessionCounters.decisionVisualizationRequests++;
  console.info(`[${LAYER}] AIOI_DECISION_VISUALIZATION_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.decisionVisualizationRequests
  });
}

function recordDecisionVisualizationCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_DECISION_VISUALIZATION_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.decisionVisualizationRequests
  });
}

function recordDecisionPerspectiveAnalyzed(companyId) {
  _sessionCounters.decisionPerspective++;
  console.info(`[${LAYER}] AIOI_DECISION_PERSPECTIVE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.decisionPerspective
  });
}

function recordDecisionConsistencyAnalyzed(companyId) {
  _sessionCounters.decisionConsistency++;
  console.info(`[${LAYER}] AIOI_DECISION_CONSISTENCY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.decisionConsistency
  });
}

function recordDecisionVisualizationCoverageAnalyzed(companyId) {
  _sessionCounters.decisionVisualizationCoverage++;
  console.info(`[${LAYER}] AIOI_DECISION_VISUALIZATION_COVERAGE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.decisionVisualizationCoverage
  });
}

function recordEnterpriseDecisionVisualizationAnalyzed(companyId) {
  _sessionCounters.enterpriseDecisionVisualization++;
  console.info(`[${LAYER}] AIOI_ENTERPRISE_DECISION_VISUALIZATION_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.enterpriseDecisionVisualization
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_DECISION_VISUALIZATION_ERROR`, {
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
    decision_visualization_requests:            _sessionCounters.decisionVisualizationRequests,
    decision_perspective_count:                 _sessionCounters.decisionPerspective,
    decision_consistency_count:                 _sessionCounters.decisionConsistency,
    decision_visualization_coverage_count:      _sessionCounters.decisionVisualizationCoverage,
    enterprise_decision_visualization_count:    _sessionCounters.enterpriseDecisionVisualization,
    decision_visualization_error_count:         _sessionCounters.errors,
    avg_query_latency_ms:                       avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    decisionVisualizationRequests: 0, decisionPerspective: 0, decisionConsistency: 0,
    decisionVisualizationCoverage: 0, enterpriseDecisionVisualization: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyDecisionPerspective(score) {
  if (score >= PERSPECTIVE_THRESHOLDS.decision_ready) return 'decision_ready';
  if (score >= PERSPECTIVE_THRESHOLDS.partial) return 'partial';
  return 'fragmented';
}

function classifyDecisionConsistency(score) {
  if (score >= CONSISTENCY_THRESHOLDS.consistent) return 'consistent';
  if (score >= CONSISTENCY_THRESHOLDS.partial) return 'partial';
  return 'inconsistent';
}

function classifyDecisionVisualizationCoverage(score) {
  if (score >= COVERAGE_THRESHOLDS.comprehensive) return 'comprehensive';
  if (score >= COVERAGE_THRESHOLDS.partial) return 'partial';
  return 'limited';
}

function classifyEnterpriseDecisionVisualization(score) {
  if (score >= ENTERPRISE_DECISION_VISUALIZATION_THRESHOLDS.visualization_ready) return 'visualization_ready';
  if (score >= ENTERPRISE_DECISION_VISUALIZATION_THRESHOLDS.executive_visualization_ready) return 'executive_visualization_ready';
  if (score >= ENTERPRISE_DECISION_VISUALIZATION_THRESHOLDS.developing) return 'developing';
  return 'emerging';
}

function _extractDecisionVisualizationSignals(ecrm) {
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
    executiveSummaryScore:        ecrm?.executive_summary?.summary_score ?? null,
    strategicOverviewScore:       ecrm?.strategic_overview?.overview_score ?? null,
    cockpitReadinessScore:        ecrm?.enterprise_cockpit_readiness?.cockpit_score ?? null,
    visualizationReadinessScore:  vrm?.enterprise_visualization_readiness?.visualization_score ?? null,
    visualizationCoverageScore:   vrm?.visualization_coverage?.coverage_score ?? null,
    trustScore:                   assuranceRm?.trust_read_model?.intelligence_trust?.trust_score ?? null,
    assuranceScore:               assuranceRm?.intelligence_assurance?.assurance_score ?? null,
    auditabilityScore:            auditRm?.enterprise_auditability?.auditability_score ?? null,
    readinessScore:               rrm?.enterprise_scale_readiness?.enterprise_readiness_score ?? null,
    governanceExcellenceScore:    germ?.enterprise_governance_excellence?.governance_excellence_score ?? null,
    institutionalizationScore:    irm?.enterprise_institutionalization?.institutionalization_score ?? null,
    sovereigntyScore:             srm?.enterprise_sovereignty?.sovereignty_score ?? null,
    autonomyScore:                arm?.enterprise_autonomy?.autonomy_score ?? null,
    consumptionScore:             crm?.enterprise_consumption?.consumption_score ?? null
  };
}

module.exports = {
  PERSPECTIVE_THRESHOLDS,
  CONSISTENCY_THRESHOLDS,
  COVERAGE_THRESHOLDS,
  ENTERPRISE_DECISION_VISUALIZATION_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyDecisionPerspective,
  classifyDecisionConsistency,
  classifyDecisionVisualizationCoverage,
  classifyEnterpriseDecisionVisualization,
  _extractDecisionVisualizationSignals,
  recordDecisionVisualizationRequested,
  recordDecisionVisualizationCompleted,
  recordDecisionPerspectiveAnalyzed,
  recordDecisionConsistencyAnalyzed,
  recordDecisionVisualizationCoverageAnalyzed,
  recordEnterpriseDecisionVisualizationAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
