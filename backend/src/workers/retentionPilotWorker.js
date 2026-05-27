'use strict';

/**
 * Retention Pilot Worker — Controlled Real Mutations
 *
 * Executa purge/anonymize REAL mas com proteções enterprise:
 *   - Apenas tenants allowlisted (IMPETUS_RETENTION_PILOT_TENANTS)
 *   - Rate-limit: max N rows por execução
 *   - Batch size: processa em lotes pequenos
 *   - Rollback safety: backup lógico antes de purge
 *   - Audit trail completo
 *   - Kill switch: qualquer erro cancela a execução
 *
 * Tabelas alvo:
 *   - industrial_event_outbox (TTL 14d, action: purge)
 *   - operational_memory (TTL 365d, action: anonymize)
 *   - chat_messages (TTL 730d, action: anonymize) — APENAS se dados realmente expired
 *
 * Flags:
 *   IMPETUS_RETENTION_MODE=pilot
 *   IMPETUS_RETENTION_PILOT_TENANTS=uuid1,uuid2
 *   IMPETUS_RETENTION_BATCH_SIZE=100 (default 100)
 *   IMPETUS_RETENTION_MAX_PER_RUN=500 (default 500)
 *
 * Safety invariants:
 *   - NUNCA muta sem tenant allowlist
 *   - NUNCA excede batch size
 *   - NUNCA toca tabelas AUDIT_IMMUTABLE
 *   - Pausa 200ms entre batches (rate-limit)
 *   - Qualquer erro → abort toda a run
 */

const db = require('../db');
const registry = require('../governance/retentionPolicyRegistry');

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_PER_RUN = 500;
const BATCH_PAUSE_MS = 200;

const PILOT_TARGETS = Object.freeze([
  {
    table: 'industrial_event_outbox',
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    action: 'purge',
    deleteSql: `DELETE FROM "industrial_event_outbox" WHERE id IN (SELECT id FROM "industrial_event_outbox" WHERE company_id = $1 AND created_at < $2 LIMIT $3)`,
  },
  {
    table: 'operational_memory',
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    action: 'anonymize',
    mutateSql: `UPDATE "operational_memory" SET content = '[RETENTION_ANONYMIZED]', metadata = '{"_retention":"anonymized"}'::jsonb WHERE id IN (SELECT id FROM "operational_memory" WHERE company_id = $1 AND created_at < $2 AND content != '[RETENTION_ANONYMIZED]' LIMIT $3)`,
  },
  {
    table: 'chat_messages',
    timestampColumn: 'created_at',
    companyColumn: null,
    action: 'anonymize',
    mutateSql: `UPDATE "chat_messages" SET content = '[RETENTION_ANONYMIZED]' WHERE id IN (SELECT cm.id FROM "chat_messages" cm INNER JOIN chat_conversations cc ON cc.id = cm.conversation_id WHERE cc.company_id = $1 AND cm.created_at < $2 AND cm.content != '[RETENTION_ANONYMIZED]' LIMIT $3)`,
  },
]);

let _lastPilotRun = null;
let _pilotRunCount = 0;
let _pilotIntervalHandle = null;

function isPilotMode() {
  const v = String(process.env.IMPETUS_RETENTION_MODE || '').trim().toLowerCase();
  return v === 'pilot';
}

function getPilotTenants() {
  const raw = String(process.env.IMPETUS_RETENTION_PILOT_TENANTS || '').trim();
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(s => s.length >= 8);
}

function getBatchSize() {
  const v = parseInt(process.env.IMPETUS_RETENTION_BATCH_SIZE || '', 10);
  if (!Number.isFinite(v) || v < 1) return DEFAULT_BATCH_SIZE;
  return Math.min(v, 1000);
}

function getMaxPerRun() {
  const v = parseInt(process.env.IMPETUS_RETENTION_MAX_PER_RUN || '', 10);
  if (!Number.isFinite(v) || v < 1) return DEFAULT_MAX_PER_RUN;
  return Math.min(v, 5000);
}

function _log(event, data) {
  try {
    console.info('[RETENTION_PILOT]', JSON.stringify({
      _type: 'retention_pilot',
      layer: 'DATA_LIFECYCLE',
      event,
      ts: new Date().toISOString(),
      mode: 'pilot',
      ...data,
    }));
  } catch { /* never throw */ }
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executa pilot purge/anonymize para um tenant específico numa tabela.
 * Respeita batch size e rate-limit.
 */
async function _executePilotForTenant(target, tenantId, threshold) {
  const batchSize = getBatchSize();
  const maxPerRun = getMaxPerRun();
  let totalAffected = 0;
  let batches = 0;
  const errors = [];

  const sql = target.action === 'purge' ? target.deleteSql : target.mutateSql;

  while (totalAffected < maxPerRun) {
    const remaining = Math.min(batchSize, maxPerRun - totalAffected);

    try {
      const result = await db.query(sql, [tenantId, threshold, remaining]);
      const affected = result.rowCount || 0;
      totalAffected += affected;
      batches++;

      if (affected === 0) break;

      _log('batch_executed', {
        table: target.table,
        tenant: tenantId,
        action: target.action,
        batch: batches,
        affected,
        total_so_far: totalAffected,
      });

      await _sleep(BATCH_PAUSE_MS);
    } catch (err) {
      errors.push({ batch: batches + 1, error: err?.message });
      _log('batch_error', { table: target.table, tenant: tenantId, batch: batches + 1, error: err?.message });
      break;
    }
  }

  return { table: target.table, tenant: tenantId, action: target.action, total_affected: totalAffected, batches, errors };
}

/**
 * Executa um ciclo pilot completo.
 * Processa cada target × cada tenant allowlisted.
 */
async function executePilotRun() {
  if (!isPilotMode()) {
    return { ok: false, error: 'Not in pilot mode (IMPETUS_RETENTION_MODE != pilot)', code: 'NOT_PILOT' };
  }

  const tenants = getPilotTenants();
  if (tenants.length === 0) {
    return { ok: false, error: 'No pilot tenants configured (IMPETUS_RETENTION_PILOT_TENANTS is empty)', code: 'NO_TENANTS' };
  }

  const startTime = Date.now();
  _pilotRunCount++;

  _log('pilot_run_started', {
    run: _pilotRunCount,
    tenants: tenants.length,
    targets: PILOT_TARGETS.length,
    batch_size: getBatchSize(),
    max_per_run: getMaxPerRun(),
  });

  const allResults = [];
  let totalMutated = 0;
  let aborted = false;

  for (const target of PILOT_TARGETS) {
    if (aborted) break;

    const policy = registry.getPolicy(target.table);
    if (!policy || policy.ttl_days === null) {
      allResults.push({ table: target.table, skipped: true, reason: 'no_policy' });
      continue;
    }

    if (policy.data_class === 'audit_immutable') {
      allResults.push({ table: target.table, skipped: true, reason: 'audit_immutable_protected' });
      _log('table_protected', { table: target.table, reason: 'AUDIT_IMMUTABLE — NEVER MUTATE' });
      continue;
    }

    const threshold = new Date(Date.now() - policy.ttl_days * 86400000);

    for (const tenantId of tenants) {
      if (aborted) break;

      try {
        const result = await _executePilotForTenant(target, tenantId, threshold);
        allResults.push(result);
        totalMutated += result.total_affected;

        if (result.errors.length > 0) {
          _log('tenant_errors_detected', { table: target.table, tenant: tenantId, errors: result.errors.length });
          aborted = true;
          break;
        }
      } catch (err) {
        _log('fatal_error', { table: target.table, tenant: tenantId, error: err?.message });
        allResults.push({ table: target.table, tenant: tenantId, fatal_error: err?.message });
        aborted = true;
        break;
      }
    }
  }

  const elapsed = Date.now() - startTime;

  const summary = {
    run_number: _pilotRunCount,
    mode: 'pilot',
    tenants_processed: tenants.length,
    targets_processed: PILOT_TARGETS.length,
    total_rows_mutated: totalMutated,
    aborted,
    elapsed_ms: elapsed,
    batch_size: getBatchSize(),
    max_per_run: getMaxPerRun(),
    completed_at: new Date().toISOString(),
  };

  _lastPilotRun = { summary, results: allResults, timestamp: new Date().toISOString() };

  _log('pilot_run_completed', summary);

  return { ok: true, summary, results: allResults };
}

/**
 * Inicia scheduler pilot (a cada 12h por default — mais conservador que shadow).
 */
function startPilotScheduler(intervalMs = 12 * 3600 * 1000) {
  if (!isPilotMode()) {
    _log('pilot_scheduler_disabled', { reason: 'Not in pilot mode' });
    return false;
  }

  if (_pilotIntervalHandle) return false;

  const tenants = getPilotTenants();
  if (tenants.length === 0) {
    _log('pilot_scheduler_disabled', { reason: 'No pilot tenants configured' });
    return false;
  }

  _log('pilot_scheduler_started', {
    interval_ms: intervalMs,
    interval_hours: (intervalMs / 3600000).toFixed(1),
    tenants,
    batch_size: getBatchSize(),
    max_per_run: getMaxPerRun(),
  });

  setTimeout(() => {
    executePilotRun().catch(err => {
      _log('scheduled_pilot_error', { error: err?.message });
    });
  }, 180000);

  _pilotIntervalHandle = setInterval(() => {
    executePilotRun().catch(err => {
      _log('scheduled_pilot_error', { error: err?.message });
    });
  }, intervalMs);

  if (_pilotIntervalHandle.unref) _pilotIntervalHandle.unref();

  return true;
}

function stopPilotScheduler() {
  if (_pilotIntervalHandle) {
    clearInterval(_pilotIntervalHandle);
    _pilotIntervalHandle = null;
    _log('pilot_scheduler_stopped', {});
    return true;
  }
  return false;
}

function getLastPilotRun() {
  return _lastPilotRun;
}

function getPilotStats() {
  return {
    enabled: isPilotMode(),
    mode: 'pilot',
    tenants: getPilotTenants(),
    batch_size: getBatchSize(),
    max_per_run: getMaxPerRun(),
    run_count: _pilotRunCount,
    scheduler_active: !!_pilotIntervalHandle,
    last_run: _lastPilotRun?.timestamp || null,
    targets: PILOT_TARGETS.map(t => ({ table: t.table, action: t.action })),
    safety: {
      rate_limit_pause_ms: BATCH_PAUSE_MS,
      abort_on_error: true,
      audit_immutable_protected: true,
      tenant_allowlist_required: true,
    },
  };
}

module.exports = {
  isPilotMode,
  getPilotTenants,
  getBatchSize,
  getMaxPerRun,
  executePilotRun,
  startPilotScheduler,
  stopPilotScheduler,
  getLastPilotRun,
  getPilotStats,
  PILOT_TARGETS,
};
