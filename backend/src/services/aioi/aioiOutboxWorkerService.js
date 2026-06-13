'use strict';

/**
 * AIOI-P2.1 — Outbox Worker Service (Production)
 *
 * Worker operacional definitivo do aioi_outbox.
 * Delega processamento ao aioiClassificationConsumerService via aioiOutboxConsumerService.
 *
 * GOVERNANÇA (WG-01..WG-10):
 *   ✓ setInterval controlado (IMPETUS_AIOI_OUTBOX_WORKER_INTERVAL_MS)
 *   ✓ Single instance lock (pg advisory lock)
 *   ✓ Safe shutdown (SIGTERM/SIGINT via stopWorker)
 *   ✓ Graceful restart (stopWorker → startWorker)
 *   ✓ Batch configurável (IMPETUS_AIOI_OUTBOX_BATCH_SIZE)
 *   ✓ Retry/DLQ preservados (outbox consumer inalterado)
 *   ✓ RLS + tenant isolation por pilot tenant
 *   ✓ Idempotência via SKIP LOCKED + idempotency_key (consumer)
 *
 * ATIVAÇÃO EXPLÍCITA:
 *   IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true
 *   IMPETUS_AIOI_ENABLED=true
 *   IMPETUS_AIOI_PILOT_TENANTS=<uuid>[,uuid] (máx. 3)
 *
 * PROIBIÇÕES:
 *   ✗ Execução autónoma de decision/execution/learning
 *   ✗ LLM / rerank / weight_versions
 *   ✗ Auto-start sem flags explícitas
 */

const db = require('../../db');
const pilotFlags = require('./aioiPilotFlags');
const classificationConsumer = require('./aioiClassificationConsumerService');
const operationalMetrics = require('./aioiOperationalMetricsService');
const operationalTelemetry = require('./aioiOperationalTelemetryService');
const productionStability = require('./aioiProductionStabilityService');

const LAYER = 'AIOI_OUTBOX_WORKER';
const ADVISORY_LOCK_KEY = 8820202606;

const DEFAULT_INTERVAL_MS = 30_000;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_STARTUP_DELAY_MS = 15_000;

let _intervalHandle = null;
let _startupDelayHandle = null;
let _shuttingDown = false;
let _cycleInProgress = false;
let _runCount = 0;
let _lastRun = null;
let _lastError = null;

function _getIntervalMs() {
  const n = parseInt(String(process.env.IMPETUS_AIOI_OUTBOX_WORKER_INTERVAL_MS || DEFAULT_INTERVAL_MS), 10);
  return Math.min(Math.max(Number.isFinite(n) ? n : DEFAULT_INTERVAL_MS, 5_000), 300_000);
}

function _getBatchSize() {
  const n = parseInt(String(process.env.IMPETUS_AIOI_OUTBOX_BATCH_SIZE || DEFAULT_BATCH_SIZE), 10);
  return Math.min(Math.max(Number.isFinite(n) ? n : DEFAULT_BATCH_SIZE, 1), 100);
}

function _isWorkerEnabled() {
  const flags = pilotFlags.getAioiFlags();
  return flags.IMPETUS_AIOI_ENABLED && flags.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED;
}

function _log(event, data = {}) {
  operationalTelemetry.emitWorkerEvent(event, data);
}

async function _tryAcquireLock(client) {
  const result = await client.query(
    'SELECT pg_try_advisory_lock($1::bigint) AS got',
    [ADVISORY_LOCK_KEY]
  );
  return result.rows[0]?.got === true;
}

async function _releaseLock(client) {
  await client.query('SELECT pg_advisory_unlock($1::bigint)', [ADVISORY_LOCK_KEY]).catch(() => {});
}

/**
 * Executa um ciclo de processamento outbox para todos os pilot tenants.
 * @returns {Promise<object>}
 */
async function executeCycle() {
  if (_shuttingDown) {
    return { ok: false, skipped: true, reason: 'shutting_down' };
  }

  if (!_isWorkerEnabled()) {
    return { ok: false, skipped: true, reason: 'worker_disabled' };
  }

  if (_cycleInProgress) {
    return { ok: false, skipped: true, reason: 'cycle_in_progress' };
  }

  const pilotValidation = pilotFlags.validatePilotConfig();
  const tenants = pilotValidation.pilot_tenants;

  if (tenants.length === 0) {
    _log('cycle_skipped', { reason: 'no_pilot_tenants' });
    return { ok: false, skipped: true, reason: 'no_pilot_tenants' };
  }

  _cycleInProgress = true;
  const startMs = Date.now();
  _runCount += 1;

  const client = await db.pool.connect();
  let lockHeld = false;

  try {
    lockHeld = await _tryAcquireLock(client);
    if (!lockHeld) {
      _log('cycle_skipped', { reason: 'single_instance_lock' });
      return { ok: false, skipped: true, reason: 'single_instance_lock' };
    }

    _log('cycle_started', { run: _runCount, tenants: tenants.length, batch_size: _getBatchSize() });

    const tenantResults = [];
    let totalProcessed = 0;
    let totalFailed = 0;

    for (const companyId of tenants) {
      const batchResult = await classificationConsumer.processClassificationBatch({
        companyId,
        batchSize: _getBatchSize()
      });

      totalProcessed += batchResult.processed || 0;
      totalFailed += batchResult.failed || 0;

      tenantResults.push({
        company_id: companyId,
        processed:  batchResult.processed || 0,
        failed:     batchResult.failed || 0
      });

      operationalMetrics.recordClassificationBatch({
        companyId,
        processed: batchResult.processed || 0,
        failed:    batchResult.failed || 0
      });
    }

    const elapsedMs = Date.now() - startMs;
    const summary = {
      run:             _runCount,
      tenants:         tenants.length,
      total_processed: totalProcessed,
      total_failed:    totalFailed,
      elapsed_ms:      elapsedMs,
      completed_at:    new Date().toISOString(),
      tenant_results:  tenantResults
    };

    _lastRun = summary;
    _lastError = null;
    productionStability.recordCycle({
      ok: true,
      elapsedMs,
      processed: totalProcessed
    });
    _log('cycle_completed', summary);

    return { ok: true, summary };
  } catch (err) {
    _lastError = err.message;
    productionStability.recordCycle({ ok: false, elapsedMs: Date.now() - startMs });
    _log('cycle_error', { run: _runCount, error: err.message });
    return { ok: false, error: err.message };
  } finally {
    if (lockHeld) {
      await _releaseLock(client);
    }
    client.release();
    _cycleInProgress = false;
  }
}

/**
 * Inicia worker com setInterval controlado.
 * @param {object} [options]
 * @param {number} [options.intervalMs]
 * @param {number} [options.startupDelayMs]
 * @returns {boolean}
 */
function startWorker(options = {}) {
  if (!_isWorkerEnabled()) {
    _log('worker_start_skipped', { reason: 'worker_disabled' });
    return false;
  }

  if (_intervalHandle) {
    return true;
  }

  const intervalMs = options.intervalMs || _getIntervalMs();
  const startupDelayMs = options.startupDelayMs ?? DEFAULT_STARTUP_DELAY_MS;

  _shuttingDown = false;

  productionStability.markWorkerStarted();

  _log('worker_started', {
    interval_ms: intervalMs,
    startup_delay_ms: startupDelayMs,
    batch_size: _getBatchSize(),
    pilot_tenants: pilotFlags.getPilotTenants()
  });

  _startupDelayHandle = setTimeout(() => {
    executeCycle().catch((err) => {
      _log('scheduled_cycle_error', { error: err.message });
    });
  }, startupDelayMs);

  if (_startupDelayHandle.unref) _startupDelayHandle.unref();

  _intervalHandle = setInterval(() => {
    executeCycle().catch((err) => {
      _log('scheduled_cycle_error', { error: err.message });
    });
  }, intervalMs);

  if (_intervalHandle.unref) _intervalHandle.unref();

  return true;
}

/**
 * Para worker (safe shutdown).
 * @returns {boolean}
 */
function stopWorker() {
  _shuttingDown = true;

  if (_startupDelayHandle) {
    clearTimeout(_startupDelayHandle);
    _startupDelayHandle = null;
  }

  if (_intervalHandle) {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
    _log('worker_stopped', { run_count: _runCount });
    return true;
  }

  return false;
}

/**
 * Graceful restart.
 * @returns {boolean}
 */
function restartWorker() {
  stopWorker();
  _shuttingDown = false;
  productionStability.recordRestart();
  return startWorker();
}

/**
 * Estado operacional do worker.
 * @returns {object}
 */
function getWorkerStatus() {
  const flags = pilotFlags.getAioiFlags();
  const pilot = pilotFlags.validatePilotConfig();

  return {
    worker_enabled:     flags.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED,
    aioi_enabled:       flags.IMPETUS_AIOI_ENABLED,
    worker_running:     !!_intervalHandle && !_shuttingDown,
    scheduler_active:   !!_intervalHandle,
    shutting_down:      _shuttingDown,
    cycle_in_progress:  _cycleInProgress,
    run_count:          _runCount,
    last_run:           _lastRun,
    last_error:         _lastError,
    interval_ms:        _getIntervalMs(),
    batch_size:         _getBatchSize(),
    pilot_tenants:      pilot.pilot_tenants,
    pilot_config_ok:    pilot.ok,
    pilot_config_errors: pilot.errors
  };
}

function registerShutdownHandlers() {
  const handler = () => {
    stopWorker();
  };
  process.once('SIGTERM', handler);
  process.once('SIGINT', handler);
}

module.exports = {
  executeCycle,
  startWorker,
  stopWorker,
  restartWorker,
  getWorkerStatus,
  registerShutdownHandlers,
  ADVISORY_LOCK_KEY
};
