'use strict';

/**
 * AIOI-P4.4 — Métricas e infraestrutura READ ONLY da Executive Cockpit Read Model Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_COCKPIT_METRICS';

const SUMMARY_THRESHOLDS = Object.freeze({ summary_ready: 70, partial: 40 });
const OVERVIEW_THRESHOLDS = Object.freeze({ overview_ready: 70, partial: 40 });
const ENTERPRISE_COCKPIT_THRESHOLDS = Object.freeze({
  cockpit_ready:   90,
  executive_ready: 70,
  developing:      40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  cockpitRequests:              0,
  executiveSummary:             0,
  strategicOverview:              0,
  enterpriseCockpitReadiness:   0,
  errors:                         0,
  total_latency_ms:               0,
  latency_samples:                0
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

function recordCockpitRequested(companyId) {
  _sessionCounters.cockpitRequests++;
  console.info(`[${LAYER}] AIOI_COCKPIT_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.cockpitRequests
  });
}

function recordCockpitCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_COCKPIT_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.cockpitRequests
  });
}

function recordExecutiveSummaryAnalyzed(companyId) {
  _sessionCounters.executiveSummary++;
  console.info(`[${LAYER}] AIOI_EXECUTIVE_SUMMARY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.executiveSummary
  });
}

function recordStrategicOverviewAnalyzed(companyId) {
  _sessionCounters.strategicOverview++;
  console.info(`[${LAYER}] AIOI_STRATEGIC_OVERVIEW_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.strategicOverview
  });
}

function recordEnterpriseCockpitReadinessAnalyzed(companyId) {
  _sessionCounters.enterpriseCockpitReadiness++;
  console.info(`[${LAYER}] AIOI_ENTERPRISE_COCKPIT_READINESS_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.enterpriseCockpitReadiness
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_COCKPIT_ERROR`, {
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
    cockpit_requests:                       _sessionCounters.cockpitRequests,
    executive_summary_count:                _sessionCounters.executiveSummary,
    strategic_overview_count:                 _sessionCounters.strategicOverview,
    enterprise_cockpit_readiness_count:       _sessionCounters.enterpriseCockpitReadiness,
    cockpit_error_count:                      _sessionCounters.errors,
    avg_query_latency_ms:                     avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    cockpitRequests: 0, executiveSummary: 0, strategicOverview: 0,
    enterpriseCockpitReadiness: 0, errors: 0, total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyExecutiveSummary(score) {
  if (score >= SUMMARY_THRESHOLDS.summary_ready) return 'summary_ready';
  if (score >= SUMMARY_THRESHOLDS.partial) return 'partial';
  return 'limited';
}

function classifyStrategicOverview(score) {
  if (score >= OVERVIEW_THRESHOLDS.overview_ready) return 'overview_ready';
  if (score >= OVERVIEW_THRESHOLDS.partial) return 'partial';
  return 'limited';
}

function classifyEnterpriseCockpitReadiness(score) {
  if (score >= ENTERPRISE_COCKPIT_THRESHOLDS.cockpit_ready) return 'cockpit_ready';
  if (score >= ENTERPRISE_COCKPIT_THRESHOLDS.executive_ready) return 'executive_ready';
  if (score >= ENTERPRISE_COCKPIT_THRESHOLDS.developing) return 'developing';
  return 'emerging';
}

function _extractCockpitSignals(vrm) {
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
    trustScore:                   assuranceRm?.trust_read_model?.intelligence_trust?.trust_score ?? null,
    assuranceScore:               assuranceRm?.intelligence_assurance?.assurance_score ?? null,
    auditabilityScore:            auditRm?.enterprise_auditability?.auditability_score ?? null,
    readinessScore:               rrm?.enterprise_scale_readiness?.enterprise_readiness_score ?? null,
    valueGovernanceScore:         vgrm?.enterprise_value_governance?.value_governance_score ?? null,
    sustainabilityScore:          srmNested?.enterprise_sustainability?.enterprise_sustainability_score ?? null,
    certificationScore:           certRm?.enterprise_certification?.certification_score ?? null,
    conformanceScore:             confRm?.intelligence_conformance?.conformance_score ?? null,
    governanceExcellenceScore:    germ?.enterprise_governance_excellence?.governance_excellence_score ?? null,
    institutionalizationScore:    irm?.enterprise_institutionalization?.institutionalization_score ?? null,
    sovereigntyScore:             srm?.enterprise_sovereignty?.sovereignty_score ?? null,
    autonomyScore:                arm?.enterprise_autonomy?.autonomy_score ?? null,
    consumptionScore:             crm?.enterprise_consumption?.consumption_score ?? null,
    visualizationCoverageScore:   vrm?.visualization_coverage?.coverage_score ?? null,
    visualizationReadinessScore:  vrm?.enterprise_visualization_readiness?.visualization_score ?? null
  };
}

module.exports = {
  SUMMARY_THRESHOLDS,
  OVERVIEW_THRESHOLDS,
  ENTERPRISE_COCKPIT_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyExecutiveSummary,
  classifyStrategicOverview,
  classifyEnterpriseCockpitReadiness,
  _extractCockpitSignals,
  recordCockpitRequested,
  recordCockpitCompleted,
  recordExecutiveSummaryAnalyzed,
  recordStrategicOverviewAnalyzed,
  recordEnterpriseCockpitReadinessAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
