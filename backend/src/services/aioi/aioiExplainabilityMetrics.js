'use strict';

/**
 * AIOI-P3.1 — Métricas e infraestrutura READ ONLY da Assurance & Explainability Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_EXPLAINABILITY_METRICS';

const EVIDENCE_THRESHOLDS = Object.freeze({ verified: 70, partial: 40 });
const TRACEABILITY_THRESHOLDS = Object.freeze({ complete: 70, partial: 40 });
const ASSURANCE_THRESHOLDS = Object.freeze({
  enterprise_assured: 90,
  high_assurance:     70,
  moderate_assurance: 40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  assuranceRequests:      0,
  evidenceAnalysis:       0,
  traceabilityAnalysis:   0,
  explainabilityAnalysis:   0,
  assuranceAnalysis:      0,
  errors:                 0,
  total_latency_ms:       0,
  latency_samples:        0
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

function recordAssuranceRequested(companyId) {
  _sessionCounters.assuranceRequests++;
  console.info(`[${LAYER}] AIOI_ASSURANCE_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.assuranceRequests
  });
}

function recordAssuranceCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_ASSURANCE_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.assuranceRequests
  });
}

function recordEvidenceAnalyzed(companyId) {
  _sessionCounters.evidenceAnalysis++;
  console.info(`[${LAYER}] AIOI_EVIDENCE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.evidenceAnalysis
  });
}

function recordTraceabilityAnalyzed(companyId) {
  _sessionCounters.traceabilityAnalysis++;
  console.info(`[${LAYER}] AIOI_TRACEABILITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.traceabilityAnalysis
  });
}

function recordExplainabilityAnalyzed(companyId) {
  _sessionCounters.explainabilityAnalysis++;
  console.info(`[${LAYER}] AIOI_EXPLAINABILITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.explainabilityAnalysis
  });
}

function recordAssuranceAnalyzed(companyId) {
  _sessionCounters.assuranceAnalysis++;
  console.info(`[${LAYER}] AIOI_ASSURANCE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.assuranceAnalysis
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_ASSURANCE_ERROR`, {
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
    assurance_requests:             _sessionCounters.assuranceRequests,
    evidence_analysis_count:        _sessionCounters.evidenceAnalysis,
    traceability_analysis_count:    _sessionCounters.traceabilityAnalysis,
    explainability_analysis_count:  _sessionCounters.explainabilityAnalysis,
    assurance_analysis_count:       _sessionCounters.assuranceAnalysis,
    assurance_error_count:          _sessionCounters.errors,
    avg_query_latency_ms:           avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    assuranceRequests: 0, evidenceAnalysis: 0, traceabilityAnalysis: 0,
    explainabilityAnalysis: 0, assuranceAnalysis: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyEvidenceStatus(score) {
  if (score >= EVIDENCE_THRESHOLDS.verified) return 'verified';
  if (score >= EVIDENCE_THRESHOLDS.partial) return 'partial';
  return 'weak';
}

function classifyTraceabilityStatus(score) {
  if (score >= TRACEABILITY_THRESHOLDS.complete) return 'complete';
  if (score >= TRACEABILITY_THRESHOLDS.partial) return 'partial';
  return 'broken';
}

function classifyAssuranceLevel(score) {
  if (score >= ASSURANCE_THRESHOLDS.enterprise_assured) return 'enterprise_assured';
  if (score >= ASSURANCE_THRESHOLDS.high_assurance) return 'high_assurance';
  if (score >= ASSURANCE_THRESHOLDS.moderate_assurance) return 'moderate_assurance';
  return 'low_assurance';
}

function buildDriver(factor, impactScore) {
  return { factor, impact_score: clampScore(impactScore) };
}

module.exports = {
  EVIDENCE_THRESHOLDS,
  TRACEABILITY_THRESHOLDS,
  ASSURANCE_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyEvidenceStatus,
  classifyTraceabilityStatus,
  classifyAssuranceLevel,
  buildDriver,
  recordAssuranceRequested,
  recordAssuranceCompleted,
  recordEvidenceAnalyzed,
  recordTraceabilityAnalyzed,
  recordExplainabilityAnalyzed,
  recordAssuranceAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
