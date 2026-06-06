'use strict';

/**
 * AIOI-P1.4 — Métricas da Operational Persistence Hardening Layer
 *
 * Logs estruturados e contadores de sessão para persistência histórica.
 */

const LAYER = 'AIOI_PERSISTENCE_METRICS';

const ALLOWED_TABLES = Object.freeze([
  'aioi_audit_events',
  'aioi_metrics_snapshots',
  'aioi_processing_history'
]);

let _sessionCounters = {
  auditPersisted:    0,
  snapshotPersisted: 0,
  historyPersisted:  0,
  skipped:           0,
  errors:            0
};

function recordAuditPersisted(companyId, eventType, ioeId) {
  _sessionCounters.auditPersisted++;
  console.info(`[${LAYER}] AIOI_AUDIT_PERSISTED`, {
    company_id:    companyId,
    event_type:    eventType,
    ioe_id:        ioeId || null,
    session_total: _sessionCounters.auditPersisted
  });
}

function recordMetricSnapshotPersisted(companyId, snapshotType) {
  _sessionCounters.snapshotPersisted++;
  console.info(`[${LAYER}] AIOI_METRIC_SNAPSHOT_PERSISTED`, {
    company_id:     companyId,
    snapshot_type:  snapshotType,
    session_total:  _sessionCounters.snapshotPersisted
  });
}

function recordHistoryPersisted(companyId, ioeId, sourceLayer) {
  _sessionCounters.historyPersisted++;
  console.info(`[${LAYER}] AIOI_HISTORY_PERSISTED`, {
    company_id:    companyId,
    ioe_id:        ioeId,
    source_layer:  sourceLayer,
    session_total: _sessionCounters.historyPersisted
  });
}

function recordSkipped(companyId, reason) {
  _sessionCounters.skipped++;
  console.info(`[${LAYER}] AIOI_PERSISTENCE_SKIPPED`, {
    company_id:    companyId,
    reason,
    session_total: _sessionCounters.skipped
  });
}

function recordError(companyId, context, error) {
  _sessionCounters.errors++;
  console.error(`[${LAYER}] AIOI_PERSISTENCE_ERROR`, {
    company_id: companyId,
    context:    context ? String(context).slice(0, 100) : 'unknown',
    error:      error ? String(error).slice(0, 200) : 'unknown',
    session_total: _sessionCounters.errors
  });
}

function getSessionCounters() {
  return {
    audit_persisted_count:    _sessionCounters.auditPersisted,
    snapshot_persisted_count: _sessionCounters.snapshotPersisted,
    history_persisted_count:  _sessionCounters.historyPersisted,
    persistence_skipped_count:_sessionCounters.skipped,
    persistence_error_count:  _sessionCounters.errors
  };
}

function resetSessionCounters() {
  _sessionCounters = {
    auditPersisted:    0,
    snapshotPersisted: 0,
    historyPersisted:  0,
    skipped:           0,
    errors:            0
  };
}

function assertAllowedTable(tableName) {
  if (!ALLOWED_TABLES.includes(tableName)) {
    throw new Error(`${LAYER}: tabela não permitida: ${tableName}`);
  }
}

function assertInsertOnlySql(sql) {
  const s = sql.trim().toUpperCase();
  if (s.startsWith('UPDATE') || s.startsWith('DELETE')) {
    throw new Error(`${LAYER}: UPDATE/DELETE proibido em P1.4`);
  }
  if (s.startsWith('INSERT')) {
    const forbidden = ['industrial_operational_events', 'aioi_outbox'];
    for (const tbl of forbidden) {
      if (sql.includes(tbl)) {
        throw new Error(`${LAYER}: INSERT em tabela legada proibido: ${tbl}`);
      }
    }
  }
}

module.exports = {
  ALLOWED_TABLES,
  recordAuditPersisted,
  recordMetricSnapshotPersisted,
  recordHistoryPersisted,
  recordSkipped,
  recordError,
  getSessionCounters,
  resetSessionCounters,
  assertAllowedTable,
  assertInsertOnlySql
};
