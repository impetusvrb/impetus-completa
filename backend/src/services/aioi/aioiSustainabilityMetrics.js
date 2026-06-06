'use strict';

/**
 * AIOI-P3.5 — Métricas e infraestrutura READ ONLY da Sustainability Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_SUSTAINABILITY_METRICS';

const STATUS_THRESHOLDS = Object.freeze({ high: 70, partial: 40 });
const HEALTH_THRESHOLDS = Object.freeze({ healthy: 70, stable: 40 });
const VALUE_SUSTAINABILITY_THRESHOLDS = Object.freeze({ highly_sustainable: 70, sustainable: 40 });
const ENTERPRISE_SUSTAINABILITY_THRESHOLDS = Object.freeze({
  enterprise_sustainable: 90,
  sustainable:            70,
  developing:             40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  sustainabilityRequests:     0,
  healthAnalysis:             0,
  continuityAnalysis:         0,
  valueSustainability:        0,
  enterpriseSustainability:   0,
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

function recordSustainabilityRequested(companyId) {
  _sessionCounters.sustainabilityRequests++;
  console.info(`[${LAYER}] AIOI_SUSTAINABILITY_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.sustainabilityRequests
  });
}

function recordSustainabilityCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_SUSTAINABILITY_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.sustainabilityRequests
  });
}

function recordHealthAnalyzed(companyId) {
  _sessionCounters.healthAnalysis++;
  console.info(`[${LAYER}] AIOI_HEALTH_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.healthAnalysis
  });
}

function recordContinuityAnalyzed(companyId) {
  _sessionCounters.continuityAnalysis++;
  console.info(`[${LAYER}] AIOI_CONTINUITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.continuityAnalysis
  });
}

function recordValueSustainabilityAnalyzed(companyId) {
  _sessionCounters.valueSustainability++;
  console.info(`[${LAYER}] AIOI_VALUE_SUSTAINABILITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.valueSustainability
  });
}

function recordEnterpriseSustainabilityAnalyzed(companyId) {
  _sessionCounters.enterpriseSustainability++;
  console.info(`[${LAYER}] AIOI_ENTERPRISE_SUSTAINABILITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.enterpriseSustainability
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_SUSTAINABILITY_ERROR`, {
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
    sustainability_requests:          _sessionCounters.sustainabilityRequests,
    health_analysis_count:            _sessionCounters.healthAnalysis,
    continuity_analysis_count:        _sessionCounters.continuityAnalysis,
    value_sustainability_count:       _sessionCounters.valueSustainability,
    enterprise_sustainability_count:  _sessionCounters.enterpriseSustainability,
    sustainability_error_count:       _sessionCounters.errors,
    avg_query_latency_ms:             avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    sustainabilityRequests: 0, healthAnalysis: 0, continuityAnalysis: 0,
    valueSustainability: 0, enterpriseSustainability: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyHealthStatus(score) {
  if (score >= HEALTH_THRESHOLDS.healthy) return 'healthy';
  if (score >= HEALTH_THRESHOLDS.stable) return 'stable';
  return 'degraded';
}

function classifyContinuityStatus(score) {
  if (score >= STATUS_THRESHOLDS.high) return 'continuous';
  if (score >= STATUS_THRESHOLDS.partial) return 'partial';
  return 'broken';
}

function classifyValueSustainabilityStatus(score) {
  if (score >= VALUE_SUSTAINABILITY_THRESHOLDS.highly_sustainable) return 'highly_sustainable';
  if (score >= VALUE_SUSTAINABILITY_THRESHOLDS.sustainable) return 'sustainable';
  return 'fragile';
}

function classifyEnterpriseSustainabilityLevel(score) {
  if (score >= ENTERPRISE_SUSTAINABILITY_THRESHOLDS.enterprise_sustainable) return 'enterprise_sustainable';
  if (score >= ENTERPRISE_SUSTAINABILITY_THRESHOLDS.sustainable) return 'sustainable';
  if (score >= ENTERPRISE_SUSTAINABILITY_THRESHOLDS.developing) return 'developing';
  return 'emerging';
}

function _extractGovernanceSignals(vgrm) {
  const rrm = vgrm?.readiness_read_model;
  const arm = rrm?.auditability_read_model;
  const assuranceRm = arm?.assurance_read_model;

  return {
    trustScore:           assuranceRm?.trust_read_model?.intelligence_trust?.trust_score ?? null,
    assuranceScore:       assuranceRm?.intelligence_assurance?.assurance_score ?? null,
    auditabilityScore:    arm?.enterprise_auditability?.auditability_score ?? null,
    readinessScore:       rrm?.enterprise_scale_readiness?.enterprise_readiness_score ?? null,
    valueGovernanceScore: vgrm?.enterprise_value_governance?.value_governance_score ?? null
  };
}

module.exports = {
  STATUS_THRESHOLDS,
  HEALTH_THRESHOLDS,
  VALUE_SUSTAINABILITY_THRESHOLDS,
  ENTERPRISE_SUSTAINABILITY_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyHealthStatus,
  classifyContinuityStatus,
  classifyValueSustainabilityStatus,
  classifyEnterpriseSustainabilityLevel,
  _extractGovernanceSignals,
  recordSustainabilityRequested,
  recordSustainabilityCompleted,
  recordHealthAnalyzed,
  recordContinuityAnalyzed,
  recordValueSustainabilityAnalyzed,
  recordEnterpriseSustainabilityAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
