'use strict';

/**
 * Retention Enforce Worker — Global Retention Enforcement
 *
 * Executa purge/anonymize para TODOS os tenants em tabelas com TTL definido.
 * Evolução final do pipeline: off → shadow → pilot → enforce.
 *
 * Características:
 *   - Idempotente: re-run seguro (filtra por deleted_at IS NULL ou content != marker)
 *   - Retry seguro: estado parcial OK, continua onde parou
 *   - Audit trail: cada run gravada em lgpd_data_requests + structured logs
 *   - Rate-limit: pausa entre batches (configurable)
 *   - Batch size: controlado por flag
 *   - Tabelas AUDIT_IMMUTABLE: NUNCA tocadas
 *   - Kill switch: mudar flag para shadow/off + PM2 restart
 *
 * Flag: IMPETUS_RETENTION_MODE=enforce
 *
 * Safety:
 *   - Abort on N consecutive errors (configurable, default 3)
 *   - Emits structured telemetry per table/tenant
 *   - Records run summary in audit for compliance (Art. 37 LGPD)
 */

const db = require('../db');
const registry = require('../governance/retentionPolicyRegistry');

const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_MAX_PER_TABLE = 2000;
const BATCH_PAUSE_MS = 150;
const MAX_CONSECUTIVE_ERRORS = 3;

const ENFORCE_TARGETS = Object.freeze([
  {
    table: 'industrial_event_outbox',
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    action: 'purge',
    idempotentFilter: '1=1',
    sql: `DELETE FROM "industrial_event_outbox" WHERE id IN (SELECT id FROM "industrial_event_outbox" WHERE created_at < $1 LIMIT $2)`,
  },
  {
    table: 'industrial_event_dlq',
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    action: 'purge',
    idempotentFilter: '1=1',
    sql: `DELETE FROM "industrial_event_dlq" WHERE id IN (SELECT id FROM "industrial_event_dlq" WHERE created_at < $1 LIMIT $2)`,
  },
  {
    table: 'app_impetus_outbox',
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    action: 'purge',
    idempotentFilter: '1=1',
    sql: `DELETE FROM "app_impetus_outbox" WHERE id IN (SELECT id FROM "app_impetus_outbox" WHERE created_at < $1 LIMIT $2)`,
  },
  {
    table: 'sessions',
    timestampColumn: 'created_at',
    companyColumn: null,
    action: 'purge',
    idempotentFilter: '1=1',
    sql: `DELETE FROM "sessions" WHERE id IN (SELECT id FROM "sessions" WHERE created_at < $1 LIMIT $2)`,
  },
  {
    table: 'notifications',
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    action: 'purge',
    idempotentFilter: '1=1',
    sql: `DELETE FROM "notifications" WHERE id IN (SELECT id FROM "notifications" WHERE created_at < $1 LIMIT $2)`,
  },
  {
    table: 'operational_memory',
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    action: 'anonymize',
    idempotentFilter: `content != '[RETENTION_ANONYMIZED]'`,
    sql: `UPDATE "operational_memory" SET content = '[RETENTION_ANONYMIZED]', metadata = '{"_retention":"anonymized"}'::jsonb WHERE id IN (SELECT id FROM "operational_memory" WHERE created_at < $1 AND content != '[RETENTION_ANONYMIZED]' LIMIT $2)`,
  },
  {
    table: 'chat_messages',
    timestampColumn: 'created_at',
    companyColumn: null,
    action: 'anonymize',
    idempotentFilter: `content != '[RETENTION_ANONYMIZED]'`,
    sql: `UPDATE "chat_messages" SET content = '[RETENTION_ANONYMIZED]' WHERE id IN (SELECT id FROM "chat_messages" WHERE created_at < $1 AND content != '[RETENTION_ANONYMIZED]' LIMIT $2)`,
  },
  {
    table: 'internal_chat_messages',
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    action: 'anonymize',
    idempotentFilter: `text_content != '[RETENTION_ANONYMIZED]'`,
    sql: `UPDATE "internal_chat_messages" SET text_content = '[RETENTION_ANONYMIZED]' WHERE id IN (SELECT id FROM "internal_chat_messages" WHERE created_at < $1 AND text_content != '[RETENTION_ANONYMIZED]' LIMIT $2)`,
  },
  {
    table: 'user_activity_logs',
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    action: 'purge',
    idempotentFilter: '1=1',
    sql: `DELETE FROM "user_activity_logs" WHERE id IN (SELECT id FROM "user_activity_logs" WHERE created_at < $1 LIMIT $2)`,
  },
  {
    table: 'dashboard_usage_events',
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    action: 'purge',
    idempotentFilter: '1=1',
    sql: `DELETE FROM "dashboard_usage_events" WHERE id IN (SELECT id FROM "dashboard_usage_events" WHERE created_at < $1 LIMIT $2)`,
  },
  {
    table: 'eventos_empresa',
    timestampColumn: 'data',
    companyColumn: 'company_id',
    action: 'anonymize',
    idempotentFilter: `descricao != '[RETENTION_ANONYMIZED]'`,
    sql: `UPDATE "eventos_empresa" SET descricao = '[RETENTION_ANONYMIZED]', equipamento = NULL, linha = NULL WHERE id IN (SELECT id FROM "eventos_empresa" WHERE data < $1 AND descricao != '[RETENTION_ANONYMIZED]' LIMIT $2)`,
  },
]);

let _lastEnforceRun = null;
let _enforceRunCount = 0;
let _enforceIntervalHandle = null;

function isEnforceMode() {
  const v = String(process.env.IMPETUS_RETENTION_MODE || '').trim().toLowerCase();
  return v === 'enforce';
}

function getEnforceBatchSize() {
  const v = parseInt(process.env.IMPETUS_RETENTION_BATCH_SIZE || '', 10);
  if (!Number.isFinite(v) || v < 1) return DEFAULT_BATCH_SIZE;
  return Math.min(v, 2000);
}

function getEnforceMaxPerTable() {
  const v = parseInt(process.env.IMPETUS_RETENTION_MAX_PER_RUN || '', 10);
  if (!Number.isFinite(v) || v < 1) return DEFAULT_MAX_PER_TABLE;
  return Math.min(v, 10000);
}

function _log(event, data) {
  try {
    console.info('[RETENTION_ENFORCE]', JSON.stringify({
      _type: 'retention_enforce',
      layer: 'DATA_LIFECYCLE',
      event,
      ts: new Date().toISOString(),
      mode: 'enforce',
      ...data,
    }));
  } catch { /* never throw */ }
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executa enforcement para uma tabela.
 * Idempotente: filtra registos já processados.
 * Retry-safe: processa em batches, estado parcial OK.
 */
async function _enforceTable(target) {
  const policy = registry.getPolicy(target.table);
  if (!policy || policy.ttl_days === null) {
    return { table: target.table, skipped: true, reason: 'no_ttl_policy' };
  }

  if (policy.data_class === 'audit_immutable') {
    return { table: target.table, skipped: true, reason: 'audit_immutable_protected' };
  }

  const threshold = new Date(Date.now() - policy.ttl_days * 86400000);
  const batchSize = getEnforceBatchSize();
  const maxPerTable = getEnforceMaxPerTable();

  let totalAffected = 0;
  let batches = 0;
  let consecutiveErrors = 0;
  const errors = [];

  while (totalAffected < maxPerTable) {
    const remaining = Math.min(batchSize, maxPerTable - totalAffected);

    try {
      const result = await db.query(target.sql, [threshold, remaining]);
      const affected = result.rowCount || 0;
      totalAffected += affected;
      batches++;
      consecutiveErrors = 0;

      if (affected === 0) break;

      _log('batch_enforced', {
        table: target.table,
        action: target.action,
        batch: batches,
        affected,
        total_so_far: totalAffected,
      });

      await _sleep(BATCH_PAUSE_MS);
    } catch (err) {
      consecutiveErrors++;
      errors.push({ batch: batches + 1, error: err?.message });
      _log('batch_error', { table: target.table, batch: batches + 1, error: err?.message, consecutive: consecutiveErrors });

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        _log('table_aborted', { table: target.table, reason: 'max_consecutive_errors', count: consecutiveErrors });
        break;
      }

      await _sleep(BATCH_PAUSE_MS * 2);
    }
  }

  return {
    table: target.table,
    action: target.action,
    ttl_days: policy.ttl_days,
    threshold: threshold.toISOString(),
    total_affected: totalAffected,
    batches,
    errors,
    aborted: consecutiveErrors >= MAX_CONSECUTIVE_ERRORS,
  };
}

/**
 * Executa enforce run global — todas tabelas, todos tenants.
 * Grava audit trail no final.
 */
async function executeEnforceRun() {
  if (!isEnforceMode()) {
    return { ok: false, error: 'Not in enforce mode (IMPETUS_RETENTION_MODE != enforce)', code: 'NOT_ENFORCE' };
  }

  const startTime = Date.now();
  _enforceRunCount++;

  _log('enforce_run_started', {
    run: _enforceRunCount,
    targets: ENFORCE_TARGETS.length,
    batch_size: getEnforceBatchSize(),
    max_per_table: getEnforceMaxPerTable(),
  });

  const results = [];
  let totalMutated = 0;
  let totalErrors = 0;
  let tablesAborted = 0;

  for (const target of ENFORCE_TARGETS) {
    const result = await _enforceTable(target);
    results.push(result);

    if (!result.skipped) {
      totalMutated += result.total_affected || 0;
      totalErrors += result.errors?.length || 0;
      if (result.aborted) tablesAborted++;
    }
  }

  const elapsed = Date.now() - startTime;

  const summary = {
    run_number: _enforceRunCount,
    mode: 'enforce',
    tables_processed: results.filter(r => !r.skipped).length,
    tables_skipped: results.filter(r => r.skipped).length,
    tables_aborted: tablesAborted,
    total_rows_mutated: totalMutated,
    total_errors: totalErrors,
    elapsed_ms: elapsed,
    batch_size: getEnforceBatchSize(),
    max_per_table: getEnforceMaxPerTable(),
    completed_at: new Date().toISOString(),
  };

  _lastEnforceRun = { summary, results, timestamp: new Date().toISOString() };

  _log('enforce_run_completed', summary);

  // Audit trail — record run in DB
  try {
    await db.query(`
      INSERT INTO audit_logs (action, entity_type, description, user_name, created_at)
      VALUES ('retention_enforce_run', 'system', $1, 'system:retention_enforce', NOW())
    `, [
      JSON.stringify({ run: _enforceRunCount, ...summary, targets_detail: results.map(r => ({ table: r.table, affected: r.total_affected, action: r.action, aborted: r.aborted })) }),
    ]);
  } catch (err) {
    _log('audit_trail_error', { error: err?.message });
  }

  return { ok: true, summary, results };
}

/**
 * Inicia scheduler enforce (a cada 24h — 1 run/dia).
 */
function startEnforceScheduler(intervalMs = 24 * 3600 * 1000) {
  if (!isEnforceMode()) {
    _log('enforce_scheduler_disabled', { reason: 'Not in enforce mode' });
    return false;
  }

  if (_enforceIntervalHandle) return false;

  _log('enforce_scheduler_started', {
    interval_ms: intervalMs,
    interval_hours: (intervalMs / 3600000).toFixed(1),
    batch_size: getEnforceBatchSize(),
    max_per_table: getEnforceMaxPerTable(),
    targets: ENFORCE_TARGETS.length,
  });

  // First run after 5 minutes (allow full boot + shadow scan first)
  setTimeout(() => {
    executeEnforceRun().catch(err => {
      _log('scheduled_enforce_error', { error: err?.message });
    });
  }, 300000);

  _enforceIntervalHandle = setInterval(() => {
    executeEnforceRun().catch(err => {
      _log('scheduled_enforce_error', { error: err?.message });
    });
  }, intervalMs);

  if (_enforceIntervalHandle.unref) _enforceIntervalHandle.unref();

  return true;
}

function stopEnforceScheduler() {
  if (_enforceIntervalHandle) {
    clearInterval(_enforceIntervalHandle);
    _enforceIntervalHandle = null;
    _log('enforce_scheduler_stopped', {});
    return true;
  }
  return false;
}

function getLastEnforceRun() {
  return _lastEnforceRun;
}

function getEnforceStats() {
  return {
    enabled: isEnforceMode(),
    mode: 'enforce',
    run_count: _enforceRunCount,
    scheduler_active: !!_enforceIntervalHandle,
    last_run: _lastEnforceRun?.timestamp || null,
    targets: ENFORCE_TARGETS.map(t => ({ table: t.table, action: t.action })),
    config: {
      batch_size: getEnforceBatchSize(),
      max_per_table: getEnforceMaxPerTable(),
      batch_pause_ms: BATCH_PAUSE_MS,
      max_consecutive_errors: MAX_CONSECUTIVE_ERRORS,
      scheduler_interval: '24h',
    },
    safety: {
      idempotent: true,
      retry_safe: true,
      audit_trail: true,
      abort_on_consecutive_errors: MAX_CONSECUTIVE_ERRORS,
      audit_immutable_protected: true,
      kill_switch: 'IMPETUS_RETENTION_MODE=off|shadow',
    },
  };
}

module.exports = {
  isEnforceMode,
  executeEnforceRun,
  startEnforceScheduler,
  stopEnforceScheduler,
  getLastEnforceRun,
  getEnforceStats,
  getEnforceBatchSize,
  getEnforceMaxPerTable,
  ENFORCE_TARGETS,
};
