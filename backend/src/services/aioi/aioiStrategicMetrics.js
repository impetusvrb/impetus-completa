'use strict';

/**
 * AIOI-P2.4 — Métricas e infraestrutura READ ONLY da Strategic Intelligence Layer
 */

const db = require('../../db');

const LAYER = 'AIOI_STRATEGIC_METRICS';

const PRIORITY_THRESHOLDS = Object.freeze({
  critical: 80,
  high:     60,
  medium:   40
});

const ALIGNMENT_THRESHOLDS = Object.freeze({
  aligned:           80,
  partially_aligned: 50
});

const FORBIDDEN_SQL = Object.freeze([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT', 'ALTER', 'TRUNCATE', 'DROP',
  'CREATE', 'GRANT', 'REVOKE'
]);

let _sessionCounters = {
  strategicRequests:    0,
  priorityAnalysis:     0,
  opportunityAnalysis:  0,
  focusAnalysis:        0,
  alignmentAnalysis:    0,
  errors:               0,
  total_latency_ms:     0,
  latency_samples:      0
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

function recordStrategicRequested(companyId) {
  _sessionCounters.strategicRequests++;
  console.info(`[${LAYER}] AIOI_STRATEGIC_REQUESTED`, {
    company_id: companyId, session_total: _sessionCounters.strategicRequests
  });
}

function recordStrategicCompleted(companyId, latencyMs) {
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_STRATEGIC_COMPLETED`, {
    company_id: companyId, session_total: _sessionCounters.strategicRequests
  });
}

function recordPriorityAnalyzed(companyId) {
  _sessionCounters.priorityAnalysis++;
  console.info(`[${LAYER}] AIOI_PRIORITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.priorityAnalysis
  });
}

function recordOpportunityAnalyzed(companyId) {
  _sessionCounters.opportunityAnalysis++;
  console.info(`[${LAYER}] AIOI_OPPORTUNITY_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.opportunityAnalysis
  });
}

function recordFocusAnalyzed(companyId) {
  _sessionCounters.focusAnalysis++;
  console.info(`[${LAYER}] AIOI_EXECUTIVE_FOCUS_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.focusAnalysis
  });
}

function recordAlignmentAnalyzed(companyId) {
  _sessionCounters.alignmentAnalysis++;
  console.info(`[${LAYER}] AIOI_ALIGNMENT_ANALYZED`, {
    company_id: companyId, session_total: _sessionCounters.alignmentAnalysis
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_STRATEGIC_ERROR`, {
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
    strategic_requests:           _sessionCounters.strategicRequests,
    priority_analysis_count:      _sessionCounters.priorityAnalysis,
    opportunity_analysis_count:   _sessionCounters.opportunityAnalysis,
    focus_analysis_count:         _sessionCounters.focusAnalysis,
    alignment_analysis_count:     _sessionCounters.alignmentAnalysis,
    strategic_error_count:        _sessionCounters.errors,
    avg_query_latency_ms:         avg
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    strategicRequests: 0, priorityAnalysis: 0, opportunityAnalysis: 0,
    focusAnalysis: 0, alignmentAnalysis: 0, errors: 0,
    total_latency_ms: 0, latency_samples: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyPriorityLevel(score) {
  if (score >= PRIORITY_THRESHOLDS.critical) return 'critical';
  if (score >= PRIORITY_THRESHOLDS.high) return 'high';
  if (score >= PRIORITY_THRESHOLDS.medium) return 'medium';
  return 'low';
}

function classifyAlignmentStatus(score) {
  if (score >= ALIGNMENT_THRESHOLDS.aligned) return 'aligned';
  if (score >= ALIGNMENT_THRESHOLDS.partially_aligned) return 'partially_aligned';
  return 'misaligned';
}

const DOMAIN_RATIONALE_MAP = Object.freeze({
  sla:        'SLA_RISK',
  backlog:    'BACKLOG_RISK',
  maturity:   'MATURITY_RISK',
  stability:  'STABILITY_RISK',
  governance: 'GOVERNANCE_RISK'
});

module.exports = {
  PRIORITY_THRESHOLDS,
  ALIGNMENT_THRESHOLDS,
  DOMAIN_RATIONALE_MAP,
  assertReadOnlySql,
  withTenantReadClient,
  readQuery,
  clampScore,
  classifyPriorityLevel,
  classifyAlignmentStatus,
  recordStrategicRequested,
  recordStrategicCompleted,
  recordPriorityAnalyzed,
  recordOpportunityAnalyzed,
  recordFocusAnalyzed,
  recordAlignmentAnalyzed,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
