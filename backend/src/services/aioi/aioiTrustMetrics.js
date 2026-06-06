'use strict';

/**
 * AIOI-P3.0 — Métricas e infraestrutura READ ONLY da Intelligence Governance & Trust Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_TRUST_METRICS';

const INTEGRITY_THRESHOLDS = Object.freeze({ verified: 70, attention: 40 });
const CONSISTENCY_THRESHOLDS = Object.freeze({ consistent: 70, attention: 40 });
const RELIABILITY_THRESHOLDS = Object.freeze({ reliable: 70, attention: 40 });
const TRUST_THRESHOLDS = Object.freeze({
  trusted_enterprise: 90,
  high_trust:         70,
  moderate_trust:     40
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  trustRequests:          0,
  integrityAnalysis:      0,
  consistencyAnalysis:    0,
  reliabilityAnalysis:    0,
  trustAnalysis:          0,
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

function recordTrustRequested(companyId) {
  _sessionCounters.trustRequests++;
  console.info(`[${LAYER}] AIOI_TRUST_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.trustRequests
  });
}

function recordTrustCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_TRUST_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.trustRequests
  });
}

function recordIntegrityAnalyzed(companyId) {
  _sessionCounters.integrityAnalysis++;
  console.info(`[${LAYER}] AIOI_INTEGRITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.integrityAnalysis
  });
}

function recordConsistencyAnalyzed(companyId) {
  _sessionCounters.consistencyAnalysis++;
  console.info(`[${LAYER}] AIOI_CONSISTENCY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.consistencyAnalysis
  });
}

function recordReliabilityAnalyzed(companyId) {
  _sessionCounters.reliabilityAnalysis++;
  console.info(`[${LAYER}] AIOI_RELIABILITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.reliabilityAnalysis
  });
}

function recordTrustAnalyzed(companyId) {
  _sessionCounters.trustAnalysis++;
  console.info(`[${LAYER}] AIOI_TRUST_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.trustAnalysis
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_TRUST_ERROR`, {
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
    trust_requests:             _sessionCounters.trustRequests,
    integrity_analysis_count:   _sessionCounters.integrityAnalysis,
    consistency_analysis_count: _sessionCounters.consistencyAnalysis,
    reliability_analysis_count: _sessionCounters.reliabilityAnalysis,
    trust_analysis_count:       _sessionCounters.trustAnalysis,
    trust_error_count:          _sessionCounters.errors,
    avg_query_latency_ms:       avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    trustRequests: 0, integrityAnalysis: 0, consistencyAnalysis: 0,
    reliabilityAnalysis: 0, trustAnalysis: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyIntegrityStatus(score) {
  if (score >= INTEGRITY_THRESHOLDS.verified) return 'verified';
  if (score >= INTEGRITY_THRESHOLDS.attention) return 'attention';
  return 'degraded';
}

function classifyConsistencyStatus(score) {
  if (score >= CONSISTENCY_THRESHOLDS.consistent) return 'consistent';
  if (score >= CONSISTENCY_THRESHOLDS.attention) return 'attention';
  return 'divergent';
}

function classifyReliabilityStatus(score) {
  if (score >= RELIABILITY_THRESHOLDS.reliable) return 'reliable';
  if (score >= RELIABILITY_THRESHOLDS.attention) return 'attention';
  return 'unreliable';
}

function classifyTrustLevel(score) {
  if (score >= TRUST_THRESHOLDS.trusted_enterprise) return 'trusted_enterprise';
  if (score >= TRUST_THRESHOLDS.high_trust) return 'high_trust';
  if (score >= TRUST_THRESHOLDS.moderate_trust) return 'moderate_trust';
  return 'low_trust';
}

function relativeDelta(a, b) {
  const base = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / base;
}

function forecastAccuracy(forecast, actual) {
  if (forecast == null && actual == null) return 100;
  const delta = relativeDelta(forecast ?? 0, actual ?? 0);
  return clampScore(100 - delta * 100);
}

function parseSnapshotPayload(payload) {
  if (!payload) return {};
  if (typeof payload === 'object') return payload;
  try { return JSON.parse(payload); } catch { return {}; }
}

module.exports = {
  INTEGRITY_THRESHOLDS,
  CONSISTENCY_THRESHOLDS,
  RELIABILITY_THRESHOLDS,
  TRUST_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyIntegrityStatus,
  classifyConsistencyStatus,
  classifyReliabilityStatus,
  classifyTrustLevel,
  relativeDelta,
  forecastAccuracy,
  parseSnapshotPayload,
  recordTrustRequested,
  recordTrustCompleted,
  recordIntegrityAnalyzed,
  recordConsistencyAnalyzed,
  recordReliabilityAnalyzed,
  recordTrustAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
