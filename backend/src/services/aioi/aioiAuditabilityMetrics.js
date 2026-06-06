'use strict';

/**
 * AIOI-P3.2 — Métricas e infraestrutura READ ONLY da Compliance & Auditability Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_AUDITABILITY_METRICS';

const STATUS_THRESHOLDS = Object.freeze({ high: 70, partial: 40 });
const AUDITABILITY_THRESHOLDS = Object.freeze({
  enterprise_auditable: 90,
  high_auditability:    70,
  moderate_auditability: 40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  auditabilityRequests:     0,
  complianceAnalysis:       0,
  auditCoverage:            0,
  evidenceChain:            0,
  governanceCoverage:       0,
  auditabilityAnalysis:     0,
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

function recordAuditabilityRequested(companyId) {
  _sessionCounters.auditabilityRequests++;
  console.info(`[${LAYER}] AIOI_AUDITABILITY_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.auditabilityRequests
  });
}

function recordAuditabilityCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_AUDITABILITY_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.auditabilityRequests
  });
}

function recordComplianceAnalyzed(companyId) {
  _sessionCounters.complianceAnalysis++;
  console.info(`[${LAYER}] AIOI_COMPLIANCE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.complianceAnalysis
  });
}

function recordAuditCoverageAnalyzed(companyId) {
  _sessionCounters.auditCoverage++;
  console.info(`[${LAYER}] AIOI_AUDIT_COVERAGE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.auditCoverage
  });
}

function recordEvidenceChainAnalyzed(companyId) {
  _sessionCounters.evidenceChain++;
  console.info(`[${LAYER}] AIOI_EVIDENCE_CHAIN_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.evidenceChain
  });
}

function recordGovernanceCoverageAnalyzed(companyId) {
  _sessionCounters.governanceCoverage++;
  console.info(`[${LAYER}] AIOI_GOVERNANCE_COVERAGE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.governanceCoverage
  });
}

function recordAuditabilityAnalyzed(companyId) {
  _sessionCounters.auditabilityAnalysis++;
  console.info(`[${LAYER}] AIOI_AUDITABILITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.auditabilityAnalysis
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_AUDITABILITY_ERROR`, {
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
    auditability_requests:          _sessionCounters.auditabilityRequests,
    compliance_analysis_count:      _sessionCounters.complianceAnalysis,
    audit_coverage_count:           _sessionCounters.auditCoverage,
    evidence_chain_count:           _sessionCounters.evidenceChain,
    governance_coverage_count:      _sessionCounters.governanceCoverage,
    auditability_analysis_count:    _sessionCounters.auditabilityAnalysis,
    auditability_error_count:       _sessionCounters.errors,
    avg_query_latency_ms:           avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    auditabilityRequests: 0, complianceAnalysis: 0, auditCoverage: 0,
    evidenceChain: 0, governanceCoverage: 0, auditabilityAnalysis: 0,
    errors: 0, total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyComplianceStatus(score) {
  if (score >= STATUS_THRESHOLDS.high) return 'compliant';
  if (score >= STATUS_THRESHOLDS.partial) return 'attention';
  return 'non_compliant';
}

function classifyCoverageStatus(score) {
  if (score >= STATUS_THRESHOLDS.high) return 'full';
  if (score >= STATUS_THRESHOLDS.partial) return 'partial';
  return 'insufficient';
}

function classifyChainStatus(score) {
  if (score >= STATUS_THRESHOLDS.high) return 'verified';
  if (score >= STATUS_THRESHOLDS.partial) return 'partial';
  return 'broken';
}

function classifyGovernanceStatus(score) {
  if (score >= STATUS_THRESHOLDS.high) return 'complete';
  if (score >= STATUS_THRESHOLDS.partial) return 'partial';
  return 'missing';
}

function classifyAuditabilityLevel(score) {
  if (score >= AUDITABILITY_THRESHOLDS.enterprise_auditable) return 'enterprise_auditable';
  if (score >= AUDITABILITY_THRESHOLDS.high_auditability) return 'high_auditability';
  if (score >= AUDITABILITY_THRESHOLDS.moderate_auditability) return 'moderate_auditability';
  return 'low_auditability';
}

module.exports = {
  STATUS_THRESHOLDS,
  AUDITABILITY_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyComplianceStatus,
  classifyCoverageStatus,
  classifyChainStatus,
  classifyGovernanceStatus,
  classifyAuditabilityLevel,
  recordAuditabilityRequested,
  recordAuditabilityCompleted,
  recordComplianceAnalyzed,
  recordAuditCoverageAnalyzed,
  recordEvidenceChainAnalyzed,
  recordGovernanceCoverageAnalyzed,
  recordAuditabilityAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
