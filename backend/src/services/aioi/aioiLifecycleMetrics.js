'use strict';

/**
 * AIOI-P1.3 — Métricas da Operational Intelligence Audit Layer
 *
 * Observabilidade de consultas read-only (somente logs + contadores de sessão).
 * Nunca persiste nem altera dados.
 */

const LAYER = 'AIOI_LIFECYCLE_METRICS';

let _sessionCounters = {
  snapshots:      0,
  queries:        0,
  backlogs:       0,
  auditRequests:  0,
  errors:         0,
  total_latency_ms: 0,
  latency_samples:  0
};

function recordSnapshot(companyId, counts, latencyMs) {
  _sessionCounters.snapshots++;
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_LIFECYCLE_SNAPSHOT`, {
    company_id:    companyId,
    counts,
    session_total: _sessionCounters.snapshots
  });
}

function recordQuery(companyId, queryType, latencyMs) {
  _sessionCounters.queries++;
  _recordLatency(latencyMs);
  console.info(`[${LAYER}] AIOI_LIFECYCLE_QUERY`, {
    company_id:    companyId,
    query_type:    queryType,
    session_total: _sessionCounters.queries
  });
}

function recordBacklogDetected(companyId, backlogType, count) {
  _sessionCounters.backlogs++;
  console.info(`[${LAYER}] AIOI_BACKLOG_DETECTED`, {
    company_id:    companyId,
    backlog_type:  backlogType,
    count,
    session_total: _sessionCounters.backlogs
  });
}

function recordAuditRequested(companyId, ioeId) {
  _sessionCounters.auditRequests++;
  console.info(`[${LAYER}] AIOI_AUDIT_REQUESTED`, {
    company_id:    companyId,
    ioe_id:        ioeId,
    session_total: _sessionCounters.auditRequests
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_AUDIT_ERROR`, {
    company_id: companyId,
    context:    context ? String(context).slice(0, 100) : 'unknown',
    error:      error ? String(error).slice(0, 200) : 'unknown',
    session_total: _sessionCounters.errors
  });
}

function _recordLatency(latencyMs) {
  if (typeof latencyMs === 'number' && latencyMs >= 0) {
    _sessionCounters.total_latency_ms += latencyMs;
    _sessionCounters.latency_samples++;
  }
}

function getSessionCounters() {
  const avgLatency = _sessionCounters.latency_samples > 0
    ? Math.round(_sessionCounters.total_latency_ms / _sessionCounters.latency_samples)
    : null;
  return {
    lifecycle_snapshots:   _sessionCounters.snapshots,
    lifecycle_queries:     _sessionCounters.queries,
    backlog_detections:    _sessionCounters.backlogs,
    audit_requests:        _sessionCounters.auditRequests,
    audit_errors:          _sessionCounters.errors,
    avg_query_latency_ms:  avgLatency
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    snapshots:        0,
    queries:        0,
    backlogs:       0,
    auditRequests:  0,
    errors:         0,
    total_latency_ms: 0,
    latency_samples:  0
  };
}

module.exports = {
  recordSnapshot,
  recordQuery,
  recordBacklogDetected,
  recordAuditRequested,
  recordError,
  getSessionCounters,
  resetSessionCounters
};
