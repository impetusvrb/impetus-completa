'use strict';

/**
 * AIOI-P2.6 — Métricas e infraestrutura READ ONLY da Resilience Intelligence Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_RESILIENCE_METRICS';

const RESILIENCE_THRESHOLDS = Object.freeze({
  highly_resilient: 70,
  resilient:        40
});

const READINESS_THRESHOLDS = Object.freeze({
  ready:     80,
  attention: 50
});

const SUSTAINABILITY_THRESHOLDS = Object.freeze({
  sustainable: 70,
  watch:       40
});

const CONCENTRATION_CRITICAL = 70;
const CONCENTRATION_HIGH = 50;

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  resilienceRequests:     0,
  resilienceAnalysis:     0,
  dependencyRisk:         0,
  recoveryReadiness:      0,
  sustainabilityAnalysis: 0,
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

function recordResilienceRequested(companyId) {
  _sessionCounters.resilienceRequests++;
  console.info(`[${LAYER}] AIOI_RESILIENCE_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.resilienceRequests
  });
}

function recordResilienceCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_RESILIENCE_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.resilienceRequests
  });
}

function recordResilienceAnalyzed(companyId) {
  _sessionCounters.resilienceAnalysis++;
  console.info(`[${LAYER}] AIOI_OPERATIONAL_RESILIENCE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.resilienceAnalysis
  });
}

function recordDependencyRiskAnalyzed(companyId) {
  _sessionCounters.dependencyRisk++;
  console.info(`[${LAYER}] AIOI_DEPENDENCY_RISK_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.dependencyRisk
  });
}

function recordRecoveryReadinessAnalyzed(companyId) {
  _sessionCounters.recoveryReadiness++;
  console.info(`[${LAYER}] AIOI_RECOVERY_READINESS_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.recoveryReadiness
  });
}

function recordSustainabilityAnalyzed(companyId) {
  _sessionCounters.sustainabilityAnalysis++;
  console.info(`[${LAYER}] AIOI_SUSTAINABILITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.sustainabilityAnalysis
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_RESILIENCE_ERROR`, {
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
    resilience_requests:            _sessionCounters.resilienceRequests,
    resilience_analysis_count:      _sessionCounters.resilienceAnalysis,
    dependency_risk_count:          _sessionCounters.dependencyRisk,
    recovery_readiness_count:       _sessionCounters.recoveryReadiness,
    sustainability_analysis_count:  _sessionCounters.sustainabilityAnalysis,
    resilience_error_count:         _sessionCounters.errors,
    avg_query_latency_ms:           avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    resilienceRequests: 0, resilienceAnalysis: 0, dependencyRisk: 0,
    recoveryReadiness: 0, sustainabilityAnalysis: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyResilienceStatus(score) {
  if (score >= RESILIENCE_THRESHOLDS.highly_resilient) return 'highly_resilient';
  if (score >= RESILIENCE_THRESHOLDS.resilient) return 'resilient';
  return 'fragile';
}

function classifyReadinessStatus(score) {
  if (score >= READINESS_THRESHOLDS.ready) return 'ready';
  if (score >= READINESS_THRESHOLDS.attention) return 'attention';
  return 'unprepared';
}

function classifySustainabilityStatus(score) {
  if (score >= SUSTAINABILITY_THRESHOLDS.sustainable) return 'sustainable';
  if (score >= SUSTAINABILITY_THRESHOLDS.watch) return 'watch';
  return 'unsustainable';
}

function capacityTrendScore(trend) {
  if (trend === 'increasing') return 90;
  if (trend === 'stable') return 70;
  if (trend === 'decreasing') return 40;
  return 55;
}

function riskRank(level) {
  const map = { low: 1, medium: 2, high: 3, critical: 4 };
  return map[level] || 1;
}

module.exports = {
  RESILIENCE_THRESHOLDS,
  READINESS_THRESHOLDS,
  SUSTAINABILITY_THRESHOLDS,
  CONCENTRATION_CRITICAL,
  CONCENTRATION_HIGH,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyResilienceStatus,
  classifyReadinessStatus,
  classifySustainabilityStatus,
  capacityTrendScore,
  riskRank,
  recordResilienceRequested,
  recordResilienceCompleted,
  recordResilienceAnalyzed,
  recordDependencyRiskAnalyzed,
  recordRecoveryReadinessAnalyzed,
  recordSustainabilityAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
