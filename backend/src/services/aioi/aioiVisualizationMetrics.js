'use strict';

/**
 * AIOI-P4.3 — Métricas e infraestrutura READ ONLY da Visualization Readiness Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_VISUALIZATION_METRICS';

const PRESENTATION_THRESHOLDS = Object.freeze({ presentation_ready: 70, partial: 40 });
const CONSISTENCY_THRESHOLDS = Object.freeze({ consistent: 70, partial: 40 });
const COVERAGE_THRESHOLDS = Object.freeze({ comprehensive: 70, partial: 40 });
const ENTERPRISE_VISUALIZATION_THRESHOLDS = Object.freeze({
  cockpit_ready:        90,
  visualization_ready:  70,
  developing:           40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  visualizationRequests:              0,
  executivePresentation:              0,
  visualizationConsistency:           0,
  visualizationCoverage:              0,
  enterpriseVisualizationReadiness:   0,
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

function recordVisualizationRequested(companyId) {
  _sessionCounters.visualizationRequests++;
  console.info(`[${LAYER}] AIOI_VISUALIZATION_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.visualizationRequests
  });
}

function recordVisualizationCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_VISUALIZATION_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.visualizationRequests
  });
}

function recordExecutivePresentationAnalyzed(companyId) {
  _sessionCounters.executivePresentation++;
  console.info(`[${LAYER}] AIOI_EXECUTIVE_PRESENTATION_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.executivePresentation
  });
}

function recordVisualizationConsistencyAnalyzed(companyId) {
  _sessionCounters.visualizationConsistency++;
  console.info(`[${LAYER}] AIOI_VISUALIZATION_CONSISTENCY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.visualizationConsistency
  });
}

function recordVisualizationCoverageAnalyzed(companyId) {
  _sessionCounters.visualizationCoverage++;
  console.info(`[${LAYER}] AIOI_VISUALIZATION_COVERAGE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.visualizationCoverage
  });
}

function recordEnterpriseVisualizationReadinessAnalyzed(companyId) {
  _sessionCounters.enterpriseVisualizationReadiness++;
  console.info(`[${LAYER}] AIOI_ENTERPRISE_VISUALIZATION_READINESS_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.enterpriseVisualizationReadiness
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_VISUALIZATION_ERROR`, {
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
    visualization_requests:                     _sessionCounters.visualizationRequests,
    executive_presentation_count:               _sessionCounters.executivePresentation,
    visualization_consistency_count:            _sessionCounters.visualizationConsistency,
    visualization_coverage_count:               _sessionCounters.visualizationCoverage,
    enterprise_visualization_readiness_count:   _sessionCounters.enterpriseVisualizationReadiness,
    visualization_error_count:                  _sessionCounters.errors,
    avg_query_latency_ms:                       avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    visualizationRequests: 0, executivePresentation: 0, visualizationConsistency: 0,
    visualizationCoverage: 0, enterpriseVisualizationReadiness: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyExecutivePresentation(score) {
  if (score >= PRESENTATION_THRESHOLDS.presentation_ready) return 'presentation_ready';
  if (score >= PRESENTATION_THRESHOLDS.partial) return 'partial';
  return 'fragmented';
}

function classifyVisualizationConsistency(score) {
  if (score >= CONSISTENCY_THRESHOLDS.consistent) return 'consistent';
  if (score >= CONSISTENCY_THRESHOLDS.partial) return 'partial';
  return 'inconsistent';
}

function classifyVisualizationCoverage(score) {
  if (score >= COVERAGE_THRESHOLDS.comprehensive) return 'comprehensive';
  if (score >= COVERAGE_THRESHOLDS.partial) return 'partial';
  return 'limited';
}

function classifyEnterpriseVisualizationReadiness(score) {
  if (score >= ENTERPRISE_VISUALIZATION_THRESHOLDS.cockpit_ready) return 'cockpit_ready';
  if (score >= ENTERPRISE_VISUALIZATION_THRESHOLDS.visualization_ready) return 'visualization_ready';
  if (score >= ENTERPRISE_VISUALIZATION_THRESHOLDS.developing) return 'developing';
  return 'emerging';
}

function _extractVisualizationSignals(crm) {
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
    trustScore:                 assuranceRm?.trust_read_model?.intelligence_trust?.trust_score ?? null,
    assuranceScore:             assuranceRm?.intelligence_assurance?.assurance_score ?? null,
    auditabilityScore:          auditRm?.enterprise_auditability?.auditability_score ?? null,
    readinessScore:             rrm?.enterprise_scale_readiness?.enterprise_readiness_score ?? null,
    valueGovernanceScore:       vgrm?.enterprise_value_governance?.value_governance_score ?? null,
    sustainabilityScore:        srmNested?.enterprise_sustainability?.enterprise_sustainability_score ?? null,
    certificationScore:         certRm?.enterprise_certification?.certification_score ?? null,
    conformanceScore:           confRm?.intelligence_conformance?.conformance_score ?? null,
    governanceExcellenceScore:  germ?.enterprise_governance_excellence?.governance_excellence_score ?? null,
    institutionalizationScore:  irm?.enterprise_institutionalization?.institutionalization_score ?? null,
    sovereigntyScore:           srm?.enterprise_sovereignty?.sovereignty_score ?? null,
    autonomyScore:              arm?.enterprise_autonomy?.autonomy_score ?? null,
    consumptionScore:           crm?.enterprise_consumption?.consumption_score ?? null
  };
}

module.exports = {
  PRESENTATION_THRESHOLDS,
  CONSISTENCY_THRESHOLDS,
  COVERAGE_THRESHOLDS,
  ENTERPRISE_VISUALIZATION_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyExecutivePresentation,
  classifyVisualizationConsistency,
  classifyVisualizationCoverage,
  classifyEnterpriseVisualizationReadiness,
  _extractVisualizationSignals,
  recordVisualizationRequested,
  recordVisualizationCompleted,
  recordExecutivePresentationAnalyzed,
  recordVisualizationConsistencyAnalyzed,
  recordVisualizationCoverageAnalyzed,
  recordEnterpriseVisualizationReadinessAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
