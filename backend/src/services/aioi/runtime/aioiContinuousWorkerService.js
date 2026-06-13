'use strict';

/**
 * AIOI-P1A.2 — Continuous Worker Service
 *
 * Worker de runtime contínuo do pipeline operacional AIOI.
 * Executa polling controlado do outbox seguido de projeção de snapshot.
 *
 * CERTIFICAÇÃO P1A:
 *   ✓ ADDITIVE ONLY — não altera serviços existentes
 *   ✓ Delega classificação ao aioiClassificationConsumerService
 *   ✓ Delega snapshot ao aioiExecutiveQueueSnapshotProjectionService
 *   ✓ Advisory lock para instância única (chave distinta do worker legado)
 *   ✓ SKIP LOCKED preservado via consumer existente
 *   ✓ Idempotência preservada (consumer existente)
 *   ✓ Graceful shutdown (SIGTERM/SIGINT)
 *   ✓ Recovery automático após restart (estado persiste no BD)
 *   ✓ Multi-tenant safe (processa pilot_tenants individualmente)
 *   ✓ RLS safe (companyId passado a cada operação)
 *
 * ATIVAÇÃO:
 *   IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=true
 *   IMPETUS_AIOI_ENABLED=true
 *   IMPETUS_AIOI_PILOT_TENANTS=<uuid>[,uuid]
 *
 * PROIBIÇÕES (P1A invariants):
 *   ✗ Execução autónoma cognitiva
 *   ✗ Recomendações / LLM
 *   ✗ Alteração de score soberano
 *   ✗ runtime_enabled = true
 *   ✗ cognitive_execution_allowed = true
 *
 * Pipeline de um ciclo:
 *   pending_outbox → classification → snapshot_projection → mark delivered
 */

const db = require('../../../db');
const pilotFlags = require('../aioiPilotFlags');
const classificationConsumer = require('../aioiClassificationConsumerService');
const snapshotService = require('../aioiExecutiveQueueSnapshotProjectionService');
const runtimeMetrics = require('./aioiRuntimeMetricsService');
const horizontalActivation = require('./aioiHorizontalActivationService');
const distributedRuntime = require('./aioiDistributedRuntimeService');

const LAYER = 'AIOI_CONTINUOUS_WORKER';

// Advisory lock distinto do worker legado (AIOI_OUTBOX_WORKER usa 8820202606)
const ADVISORY_LOCK_KEY = 8820202607;

const DEFAULT_INTERVAL_MS   = 30_000;
const DEFAULT_BATCH_SIZE    = 10;
const DEFAULT_STARTUP_DELAY = 10_000;

// Runtime state
let _intervalHandle     = null;
let _startupDelayHandle = null;
let _shuttingDown       = false;
let _cycleInProgress    = false;
let _runCount           = 0;
let _lastRun            = null;
let _lastError          = null;
let _startedAt          = null;

// ─── Safety: invariants imutáveis ─────────────────────────────────────────

const RUNTIME_INVARIANTS = Object.freeze({
  runtime_enabled:             false,
  runtime_active:              false,
  runtime_authorized:          false,
  cognitive_execution_allowed: false,
  auto_execute_band:           'none'
});

function _validateInvariants() {
  const flags = pilotFlags.getAioiFlags();
  const autoExec = flags.IMPETUS_AIOI_AUTO_EXECUTE_BAND;
  if (autoExec && autoExec !== 'none') {
    throw new Error(`INVARIANT_VIOLATION: auto_execute_band=${autoExec} — proibido em P1A`);
  }
}

// ─── Config helpers ────────────────────────────────────────────────────────

function _isEnabled() {
  const flags = pilotFlags.getAioiFlags();
  return flags.IMPETUS_AIOI_ENABLED &&
         String(process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED || 'false').toLowerCase() === 'true';
}

function _getIntervalMs() {
  const n = parseInt(
    String(process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_INTERVAL_MS || DEFAULT_INTERVAL_MS), 10
  );
  return Math.min(Math.max(Number.isFinite(n) ? n : DEFAULT_INTERVAL_MS, 5_000), 300_000);
}

function _getBatchSize() {
  const n = parseInt(
    String(process.env.IMPETUS_AIOI_OUTBOX_BATCH_SIZE || DEFAULT_BATCH_SIZE), 10
  );
  return Math.min(Math.max(Number.isFinite(n) ? n : DEFAULT_BATCH_SIZE, 1), 100);
}

function _log(event, data = {}) {
  console.info(JSON.stringify({ layer: LAYER, event, ...data }));
}

// ─── Advisory lock ────────────────────────────────────────────────────────

async function _tryAcquireLock(client) {
  const res = await client.query(
    'SELECT pg_try_advisory_lock($1::bigint) AS got',
    [ADVISORY_LOCK_KEY]
  );
  return res.rows[0]?.got === true;
}

async function _releaseLock(client) {
  await client.query('SELECT pg_advisory_unlock($1::bigint)', [ADVISORY_LOCK_KEY]).catch(() => {});
}

// ─── Cycle ────────────────────────────────────────────────────────────────

/**
 * Executa um ciclo completo do pipeline operacional para todos os pilot tenants.
 * classificação → snapshot
 *
 * @returns {Promise<object>}
 */
async function executeCycle() {
  if (!_isEnabled()) {
    return { ok: false, skipped: true, reason: 'worker_disabled' };
  }

  if (_cycleInProgress) {
    return { ok: false, skipped: true, reason: 'cycle_in_progress' };
  }

  _validateInvariants();

  const cycleResolution = horizontalActivation.resolveCycleTenants();
  let tenants = cycleResolution.tenants || [];

  if (tenants.length === 0) {
    _log('cycle_skipped', { reason: 'no_pilot_tenants', registry_active: cycleResolution.registry_active });
    return { ok: false, skipped: true, reason: 'no_pilot_tenants' };
  }

  _cycleInProgress = true;
  const startMs = Date.now();
  _runCount += 1;

  const client = await db.pool.connect();
  let lockHeld = false;
  let ownershipLeases = null;
  let distributedCycle = null;

  try {
    lockHeld = await _tryAcquireLock(client);
    if (!lockHeld) {
      _log('cycle_skipped', { reason: 'single_instance_lock', run: _runCount });
      return { ok: false, skipped: true, reason: 'single_instance_lock' };
    }

    if (distributedRuntime.isDistributedActive()) {
      distributedCycle = await distributedRuntime.prepareDistributedCycle(tenants);
      ownershipLeases = distributedCycle;
      tenants = distributedCycle.tenants_for_worker || [];
    } else {
      ownershipLeases = await horizontalActivation.acquireOwnershipLeases();
    }

    _log('cycle_started', {
      run: _runCount,
      tenants: tenants.length,
      batch_size: _getBatchSize(),
      execution_mode: cycleResolution.execution_mode,
      tenant_source: cycleResolution.source,
      registry_active: cycleResolution.registry_active,
      fallback_used: cycleResolution.fallback_used || false,
      ownership_runtime: ownershipLeases?.active || false,
      distributed_runtime: distributedCycle?.distributed || false,
      worker_id: distributedCycle?.worker_id,
      worker_count: distributedCycle?.worker_count
    });

    const pipelineResult = await horizontalActivation.executeTenantPipeline({
      tenants,
      runCount: _runCount
    });

    const tenantResults = pipelineResult.tenant_results || [];
    let totalClassified = 0;
    let totalFailed = 0;
    let totalSnapshots = 0;

    for (const tr of tenantResults) {
      totalClassified += tr.classified || 0;
      totalFailed += tr.failed || 0;
      if (tr.snapshot_ok) totalSnapshots += 1;
      _log('tenant_cycle', {
        run: _runCount,
        company_id: tr.company_id,
        classified: tr.classified,
        failed: tr.failed,
        snapshot_ok: tr.snapshot_ok,
        shard_id: tr.shard_id
      });
    }

    horizontalActivation.recordSoakCycle({
      classified: totalClassified,
      failed: totalFailed,
      ownership_conflicts: distributedCycle?.ownership_validation?.ownership_conflicts || 0,
      lease_conflicts: ownershipLeases?.leases?.filter(l => !l.acquired).length || 0
    });

    if (distributedRuntime.isDistributedActive()) {
      distributedRuntime.recordDistributedCycle({
        events: totalClassified,
        failed: totalFailed,
        ownership_conflicts: distributedCycle?.ownership_validation?.ownership_conflicts || 0,
        lease_conflicts: ownershipLeases?.leases?.filter(l => !l.acquired).length || 0
      });
    }

    const elapsedMs = Date.now() - startMs;
    runtimeMetrics.recordCycleLatency(elapsedMs);

    const summary = {
      run:              _runCount,
      tenants:          tenants.length,
      total_classified: totalClassified,
      total_failed:     totalFailed,
      total_snapshots:  totalSnapshots,
      elapsed_ms:       elapsedMs,
      completed_at:     new Date().toISOString(),
      tenant_results:   tenantResults,
      execution_mode:   pipelineResult.mode,
      tenant_source:    cycleResolution.source,
      registry_active:  cycleResolution.registry_active,
      fallback_used:    cycleResolution.fallback_used || false,
      ownership_runtime: ownershipLeases,
      distributed_runtime: distributedCycle,
      invariants:       RUNTIME_INVARIANTS
    };

    _lastRun   = summary;
    _lastError = null;

    _log('cycle_completed', {
      run:              _runCount,
      elapsed_ms:       elapsedMs,
      total_classified: totalClassified,
      total_snapshots:  totalSnapshots
    });

    return { ok: true, summary };

  } catch (err) {
    _lastError = err.message;
    _log('cycle_error', { run: _runCount, error: err.message });
    return { ok: false, error: err.message };
  } finally {
    if (ownershipLeases) await horizontalActivation.releaseOwnershipLeases(ownershipLeases);
    if (lockHeld) await _releaseLock(client);
    client.release();
    _cycleInProgress = false;
  }
}

// ─── Start / Stop / Restart ───────────────────────────────────────────────

/**
 * Inicia worker com setInterval controlado e delay de startup.
 * @returns {object} status inicial
 */
function startWorker(options = {}) {
  if (!_isEnabled()) {
    _log('worker_start_skipped', { reason: 'IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=false' });
    return { started: false, reason: 'worker_disabled' };
  }

  if (_intervalHandle) {
    _log('worker_already_running');
    return { started: false, reason: 'already_running' };
  }

  _shuttingDown = false;
  _startedAt    = new Date().toISOString();

  const startupDelay = options.startupDelayMs !== undefined
    ? options.startupDelayMs
    : DEFAULT_STARTUP_DELAY;

  const intervalMs = _getIntervalMs();

  _startupDelayHandle = setTimeout(() => {
    if (_shuttingDown) return;
    executeCycle().catch((err) => _log('cycle_uncaught', { error: err.message }));
    _intervalHandle = setInterval(() => {
      if (_shuttingDown) return;
      executeCycle().catch((err) => _log('cycle_uncaught', { error: err.message }));
    }, intervalMs);
  }, startupDelay);

  _log('worker_started', {
    startup_delay_ms: startupDelay,
    interval_ms:      intervalMs,
    batch_size:       _getBatchSize()
  });

  return { started: true, interval_ms: intervalMs, startup_delay_ms: startupDelay };
}

/**
 * Para worker (safe shutdown).
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
  }

  _log('worker_stopped', { run_count: _runCount });
}

/**
 * Reinicia worker (recovery automático).
 */
function restartWorker() {
  stopWorker();
  _shuttingDown = false;
  return startWorker({ startupDelayMs: 2_000 });
}

// ─── Shutdown handlers ────────────────────────────────────────────────────

function registerShutdownHandlers() {
  const handler = () => stopWorker();
  process.once('SIGTERM', handler);
  process.once('SIGINT',  handler);
}

// ─── Status ───────────────────────────────────────────────────────────────

/**
 * Estado operacional do worker.
 * @returns {object}
 */
function getWorkerStatus() {
  const flags = pilotFlags.getAioiFlags();
  const pilot = pilotFlags.validatePilotConfig();
  const metrics = runtimeMetrics.getMetricsSummary();
  const activation = horizontalActivation.getActivationFlags();
  const tenantResolution = horizontalActivation.resolveActiveTenants();

  return {
    layer:                    LAYER,
    worker_enabled:           _isEnabled(),
    continuous_runtime_flag:  String(process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED || 'false').toLowerCase() === 'true',
    aioi_enabled:             flags.IMPETUS_AIOI_ENABLED,
    worker_running:           !!_intervalHandle && !_shuttingDown,
    scheduler_active:         !!_intervalHandle,
    shutting_down:            _shuttingDown,
    cycle_in_progress:        _cycleInProgress,
    run_count:                _runCount,
    started_at:               _startedAt,
    last_run:                 _lastRun,
    last_error:               _lastError,
    interval_ms:              _getIntervalMs(),
    batch_size:               _getBatchSize(),
    pilot_tenants:            pilot.pilot_tenants || [],
    pilot_config_ok:          pilot.ok,
    activation_flags:         activation,
    tenant_source:            tenantResolution.source,
    registry_active:          tenantResolution.registry_active,
    fallback_used:            tenantResolution.fallback_used || false,
    ownership_runtime:        horizontalActivation.getOwnershipRuntimeState(),
    distributed_runtime:      distributedRuntime.getDistributedFlags(),
    soak_metrics:             horizontalActivation.getSoakMetrics(),
    runtime_invariants:       RUNTIME_INVARIANTS,
    metrics_summary:          metrics
  };
}

module.exports = {
  executeCycle,
  startWorker,
  stopWorker,
  restartWorker,
  registerShutdownHandlers,
  getWorkerStatus,
  RUNTIME_INVARIANTS,
  LAYER,
  ADVISORY_LOCK_KEY
};
