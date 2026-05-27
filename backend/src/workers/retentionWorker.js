'use strict';

/**
 * Retention Worker — Enterprise Unified (T1.7)
 *
 * Worker unificado que orquestra o pipeline completo de retention:
 *   1. Resolve elegibilidade (retentionEligibilityResolver)
 *   2. Executa purge/anonymize (retentionPurgeExecutor)
 *   3. Emite audit trail (retentionAuditEmitter)
 *
 * Modes:
 *   - shadow: apenas resolve + emite scan
 *   - pilot: resolve + executa (tenant-scoped) + emite pilot
 *   - enforce: resolve + executa (global) + emite enforce
 *
 * Scheduler: 24h auto-start no boot
 * Lock: por tenant (semáforo lógico — evita concorrência)
 * Retry: safe (idempotent operations, batch-based)
 *
 * Flags:
 *   IMPETUS_RETENTION_ENABLED=true|false (kill switch global)
 *   IMPETUS_RETENTION_MODE=off|shadow|pilot|enforce
 *   IMPETUS_RETENTION_PILOT_LIMIT=number
 *   IMPETUS_RETENTION_BATCH_SIZE=number
 */

const eligibilityResolver = require('../governance/retentionEligibilityResolver');
const purgeExecutor = require('../governance/retentionPurgeExecutor');
const auditEmitter = require('../governance/retentionAuditEmitter');
const registry = require('../governance/retentionPolicyRegistry');

const LAYER = 'RETENTION_WORKER_UNIFIED';
let _intervalHandle = null;
let _runCount = 0;
let _lastRun = null;
let _activeLocks = new Set();

function _getMode() {
  const v = String(process.env.IMPETUS_RETENTION_MODE || '').trim().toLowerCase();
  if (['shadow', 'pilot', 'enforce'].includes(v)) return v;
  return 'off';
}

function _isEnabled() {
  const enabled = String(process.env.IMPETUS_RETENTION_ENABLED || 'true').trim().toLowerCase();
  return enabled !== 'false' && enabled !== '0';
}

function _getPilotTenants() {
  const raw = String(process.env.IMPETUS_RETENTION_PILOT_TENANTS || '').trim();
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(s => s.length >= 8);
}

function _log(event, data) {
  try {
    console.info('[RETENTION_WORKER]', JSON.stringify({
      _type: 'retention_worker_unified',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      mode: _getMode(),
      ...data,
    }));
  } catch { /* never throw */ }
}

/**
 * Acquire lock por tenant (memória — evita runs concorrentes).
 */
function _acquireLock(key) {
  if (_activeLocks.has(key)) return false;
  _activeLocks.add(key);
  return true;
}

function _releaseLock(key) {
  _activeLocks.delete(key);
}

/**
 * Executa um ciclo completo do worker unificado.
 */
async function executeRun() {
  const mode = _getMode();
  if (mode === 'off') {
    _log('run_skipped', { reason: 'mode_off' });
    return { ok: false, reason: 'mode_off' };
  }

  if (!_isEnabled()) {
    _log('run_skipped', { reason: 'retention_disabled' });
    return { ok: false, reason: 'retention_disabled' };
  }

  const lockKey = `unified_run_${mode}`;
  if (!_acquireLock(lockKey)) {
    _log('run_skipped', { reason: 'concurrent_lock' });
    return { ok: false, reason: 'concurrent_lock' };
  }

  _runCount++;
  const startTime = Date.now();
  _log('run_started', { run: _runCount, mode });

  try {
    // STEP 1: Resolve eligibility
    const eligibility = await eligibilityResolver.resolveAll();
    _log('eligibility_resolved', { total_eligible: eligibility.total_eligible });

    // STEP 2: Execute based on mode
    const purgeResults = [];
    let totalMutated = 0;

    if (mode === 'shadow') {
      // Shadow: apenas emite audit do scan
      await auditEmitter.emitShadowScan({
        tables_scanned: eligibility.tables_resolved,
        total_expired_rows: eligibility.total_eligible,
        total_estimated_purge_mb: 0,
        mutations: 0,
        scanned_at: eligibility.resolved_at,
      });
    } else if (mode === 'pilot') {
      const tenants = _getPilotTenants();
      if (tenants.length === 0) {
        _log('pilot_no_tenants', { reason: 'no_pilot_tenants_configured' });
      } else {
        for (const table of Object.keys(purgeExecutor.PURGE_SQL)) {
          const policy = registry.getPolicy(table);
          if (!policy || policy.ttl_days === null) continue;

          const threshold = new Date(Date.now() - policy.ttl_days * 86400000);

          for (const tenantId of tenants) {
            const result = await purgeExecutor.executePurge(table, threshold, { tenantId });
            purgeResults.push(result);
            totalMutated += result.affected || 0;
          }
        }

        await auditEmitter.emitPilotPurge({
          run_number: _runCount,
          total_rows_mutated: totalMutated,
          aborted: purgeResults.some(r => r.aborted),
          elapsed_ms: Date.now() - startTime,
        }, tenants[0]);
      }
    } else if (mode === 'enforce') {
      for (const table of Object.keys(purgeExecutor.PURGE_SQL)) {
        const policy = registry.getPolicy(table);
        if (!policy || policy.ttl_days === null) continue;
        if (policy.data_class === registry.DATA_CLASS.AUDIT_IMMUTABLE) continue;

        const threshold = new Date(Date.now() - policy.ttl_days * 86400000);
        const result = await purgeExecutor.executePurge(table, threshold, {});
        purgeResults.push(result);
        totalMutated += result.affected || 0;
      }

      await auditEmitter.emitEnforcePurge({
        run_number: _runCount,
        tables_processed: purgeResults.length,
        total_rows_mutated: totalMutated,
        tables_aborted: purgeResults.filter(r => r.aborted).length,
        elapsed_ms: Date.now() - startTime,
      });
    }

    // STEP 3: Emit eligibility audit
    await auditEmitter.emitEligibilityResolved(eligibility);

    const elapsed = Date.now() - startTime;
    const summary = {
      run_number: _runCount,
      mode,
      total_eligible: eligibility.total_eligible,
      total_mutated: totalMutated,
      tables_processed: purgeResults.length,
      elapsed_ms: elapsed,
      completed_at: new Date().toISOString(),
    };

    _lastRun = summary;
    _log('run_completed', summary);

    return { ok: true, summary, eligibility_results: eligibility.results, purge_results: purgeResults };
  } catch (err) {
    _log('run_error', { error: err?.message, run: _runCount });
    return { ok: false, error: err?.message };
  } finally {
    _releaseLock(lockKey);
  }
}

/**
 * Inicia scheduler (24h default).
 */
function startScheduler(intervalMs = 24 * 3600 * 1000) {
  const mode = _getMode();
  if (mode === 'off' || !_isEnabled()) {
    _log('scheduler_disabled', { reason: mode === 'off' ? 'mode_off' : 'retention_disabled' });
    return false;
  }

  if (_intervalHandle) return true;

  _log('scheduler_started', { interval_ms: intervalMs, mode });

  // First run after 3 minutes
  setTimeout(() => executeRun().catch(() => {}), 3 * 60 * 1000);

  _intervalHandle = setInterval(() => {
    executeRun().catch(() => {});
  }, intervalMs);

  if (_intervalHandle.unref) _intervalHandle.unref();
  return true;
}

function stopScheduler() {
  if (_intervalHandle) {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
    _log('scheduler_stopped', {});
    return true;
  }
  return false;
}

function getWorkerStats() {
  return {
    mode: _getMode(),
    enabled: _isEnabled(),
    run_count: _runCount,
    scheduler_active: !!_intervalHandle,
    last_run: _lastRun,
    active_locks: _activeLocks.size,
    pilot_tenants: _getPilotTenants(),
    supported_tables: Object.keys(purgeExecutor.PURGE_SQL),
    diagnostics: {
      eligibility: eligibilityResolver.getTargetTables().length + ' targets',
      executor: purgeExecutor.getDiagnostics(),
    },
  };
}

module.exports = {
  executeRun,
  startScheduler,
  stopScheduler,
  getWorkerStats,
};
