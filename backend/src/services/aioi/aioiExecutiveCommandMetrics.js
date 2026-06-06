'use strict';

/**
 * AIOI-P2.9 — Métricas e infraestrutura READ ONLY da Executive Command Intelligence Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_EXECUTIVE_COMMAND_METRICS';

const READINESS_THRESHOLDS = Object.freeze({
  enterprise_ready: 90,
  advanced:         70,
  progressing:      40
});

const ATTENTION_THRESHOLDS = Object.freeze({
  critical:  75,
  attention: 50,
  monitor:   25
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  commandRequests:    0,
  commandState:       0,
  priorityMatrix:     0,
  attentionMap:       0,
  readiness:          0,
  errors:             0,
  total_latency_ms:   0,
  latency_samples:    0
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

function recordCommandRequested(companyId) {
  _sessionCounters.commandRequests++;
  console.info(`[${LAYER}] AIOI_COMMAND_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.commandRequests
  });
}

function recordCommandCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_COMMAND_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.commandRequests
  });
}

function recordCommandStateAnalyzed(companyId) {
  _sessionCounters.commandState++;
  console.info(`[${LAYER}] AIOI_COMMAND_STATE_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.commandState
  });
}

function recordPriorityMatrixAnalyzed(companyId) {
  _sessionCounters.priorityMatrix++;
  console.info(`[${LAYER}] AIOI_PRIORITY_MATRIX_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.priorityMatrix
  });
}

function recordAttentionMapAnalyzed(companyId) {
  _sessionCounters.attentionMap++;
  console.info(`[${LAYER}] AIOI_ATTENTION_MAP_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.attentionMap
  });
}

function recordReadinessAnalyzed(companyId) {
  _sessionCounters.readiness++;
  console.info(`[${LAYER}] AIOI_READINESS_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.readiness
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_COMMAND_ERROR`, {
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
    command_requests:         _sessionCounters.commandRequests,
    command_state_count:      _sessionCounters.commandState,
    priority_matrix_count:    _sessionCounters.priorityMatrix,
    attention_map_count:      _sessionCounters.attentionMap,
    readiness_count:          _sessionCounters.readiness,
    command_error_count:      _sessionCounters.errors,
    avg_query_latency_ms:     avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    commandRequests: 0, commandState: 0, priorityMatrix: 0,
    attentionMap: 0, readiness: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyReadinessLevel(score) {
  if (score >= READINESS_THRESHOLDS.enterprise_ready) return 'enterprise_ready';
  if (score >= READINESS_THRESHOLDS.advanced) return 'advanced';
  if (score >= READINESS_THRESHOLDS.progressing) return 'progressing';
  return 'emerging';
}

function classifyAttentionLevel(score) {
  if (score >= ATTENTION_THRESHOLDS.critical) return 'critical';
  if (score >= ATTENTION_THRESHOLDS.attention) return 'attention';
  if (score >= ATTENTION_THRESHOLDS.monitor) return 'monitor';
  return 'observe';
}

function resilienceAttentionScore(resilienceStatus) {
  const map = { fragile: 85, resilient: 45, highly_resilient: 15 };
  return map[resilienceStatus] ?? 50;
}

module.exports = {
  READINESS_THRESHOLDS,
  ATTENTION_THRESHOLDS,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyReadinessLevel,
  classifyAttentionLevel,
  resilienceAttentionScore,
  recordCommandRequested,
  recordCommandCompleted,
  recordCommandStateAnalyzed,
  recordPriorityMatrixAnalyzed,
  recordAttentionMapAnalyzed,
  recordReadinessAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
