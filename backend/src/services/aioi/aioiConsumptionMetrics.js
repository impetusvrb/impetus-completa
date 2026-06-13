'use strict';

/**
 * AIOI-P4.2 — Métricas e infraestrutura READ ONLY da Consumption Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_CONSUMPTION_METRICS';

const VISIBILITY_THRESHOLDS = Object.freeze({ visible: 70, partial: 40 });
const DECISION_CONSUMPTION_THRESHOLDS = Object.freeze({ consumable: 70, partial: 40 });
const ACCESSIBILITY_THRESHOLDS = Object.freeze({ accessible: 70, partial: 40 });
const ENTERPRISE_CONSUMPTION_THRESHOLDS = Object.freeze({
  consumption_ready: 90,
  executive_ready:   70,
  developing:        40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  consumptionRequests:          0,
  executiveVisibility:          0,
  decisionConsumption:          0,
  intelligenceAccessibility:    0,
  enterpriseConsumption:        0,
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

function recordConsumptionRequested(companyId) {
  _sessionCounters.consumptionRequests++;
  console.info(`[${LAYER}] AIOI_CONSUMPTION_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.consumptionRequests
  });
}

function recordConsumptionCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_CONSUMPTION_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.consumptionRequests
  });
}

function recordExecutiveVisibilityAnalyzed(companyId) {
  _sessionCounters.executiveVisibility++;
  console.info(`[${LAYER}] AIOI_EXECUTIVE_VISIBILITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.executiveVisibility
  });
}

function recordDecisionConsumptionAnalyzed(companyId) {
  _sessionCounters.decisionConsumption++;
  console.info(`[${LAYER}] AIOI_DECISION_CONSUMPTION_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.decisionConsumption
  });
}

function recordIntelligenceAccessibilityAnalyzed(companyId) {
  _sessionCounters.intelligenceAccessibility++;
  console.info(`[${LAYER}] AIOI_INTELLIGENCE_ACCESSIBILITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.intelligenceAccessibility
  });
}

function recordEnterpriseConsumptionAnalyzed(companyId) {
  _sessionCounters.enterpriseConsumption++;
  console.info(`[${LAYER}] AIOI_ENTERPRISE_CONSUMPTION_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.enterpriseConsumption
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_CONSUMPTION_ERROR`, {
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
    consumption_requests:               _sessionCounters.consumptionRequests,
    executive_visibility_count:           _sessionCounters.executiveVisibility,
    decision_consumption_count:           _sessionCounters.decisionConsumption,
    intelligence_accessibility_count:   _sessionCounters.intelligenceAccessibility,
    enterprise_consumption_count:         _sessionCounters.enterpriseConsumption,
    consumption_error_count:              _sessionCounters.errors,
    avg_query_latency_ms:                 avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    consumptionRequests: 0, executiveVisibility: 0, decisionConsumption: 0,
    intelligenceAccessibility: 0, enterpriseConsumption: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyExecutiveVisibility(score) {
  if (score >= VISIBILITY_THRESHOLDS.visible) return 'visible';
  if (score >= VISIBILITY_THRESHOLDS.partial) return 'partial';
  return 'opaque';
}

function classifyDecisionConsumption(score) {
  if (score >= DECISION_CONSUMPTION_THRESHOLDS.consumable) return 'consumable';
  if (score >= DECISION_CONSUMPTION_THRESHOLDS.partial) return 'partial';
  return 'fragmented';
}

function classifyIntelligenceAccessibility(score) {
  if (score >= ACCESSIBILITY_THRESHOLDS.accessible) return 'accessible';
  if (score >= ACCESSIBILITY_THRESHOLDS.partial) return 'partial';
  return 'restricted';
}

function classifyEnterpriseConsumption(score) {
  if (score >= ENTERPRISE_CONSUMPTION_THRESHOLDS.consumption_ready) return 'consumption_ready';
  if (score >= ENTERPRISE_CONSUMPTION_THRESHOLDS.executive_ready) return 'executive_ready';
  if (score >= ENTERPRISE_CONSUMPTION_THRESHOLDS.developing) return 'developing';
  return 'emerging';
}

function _extractConsumptionSignals(arm) {
  const srm = arm?.sovereignty_read_model;
  const irm = srm?.institutionalization_read_model;
  const germ = irm?.governance_excellence_read_model;
  const confRm = germ?.conformance_read_model;
  const crm = confRm?.certification_read_model;
  const srmNested = crm?.sustainability_read_model;
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
    certificationScore:         crm?.enterprise_certification?.certification_score ?? null,
    conformanceScore:           confRm?.intelligence_conformance?.conformance_score ?? null,
    governanceExcellenceScore:  germ?.enterprise_governance_excellence?.governance_excellence_score ?? null,
    institutionalizationScore:  irm?.enterprise_institutionalization?.institutionalization_score ?? null,
    sovereigntyScore:           srm?.enterprise_sovereignty?.sovereignty_score ?? null,
    autonomyScore:              arm?.enterprise_autonomy?.autonomy_score ?? null
  };
}

module.exports = {
  VISIBILITY_THRESHOLDS,
  DECISION_CONSUMPTION_THRESHOLDS,
  ACCESSIBILITY_THRESHOLDS,
  ENTERPRISE_CONSUMPTION_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyExecutiveVisibility,
  classifyDecisionConsumption,
  classifyIntelligenceAccessibility,
  classifyEnterpriseConsumption,
  _extractConsumptionSignals,
  recordConsumptionRequested,
  recordConsumptionCompleted,
  recordExecutiveVisibilityAnalyzed,
  recordDecisionConsumptionAnalyzed,
  recordIntelligenceAccessibilityAnalyzed,
  recordEnterpriseConsumptionAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
