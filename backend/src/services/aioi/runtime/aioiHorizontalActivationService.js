'use strict';

/**
 * AIOI-P1G — Horizontal Activation Service
 *
 * Ativação controlada dos componentes P1E/P1F no runtime operacional.
 * ADDITIVE ONLY · feature flags · fallback instantâneo · rollback imediato.
 *
 * Flags:
 *   IMPETUS_AIOI_REGISTRY_ACTIVE=false
 *   IMPETUS_AIOI_PARALLEL_TENANT_EXECUTION=false
 *   IMPETUS_AIOI_OWNERSHIP_RUNTIME_ACTIVE=false
 */

const os = require('os');
const { v5: uuidv5 } = require('uuid');
const pilotFlags = require('../aioiPilotFlags');
const tenantRegistry = require('./aioiTenantRegistryService');
const partitionSvc = require('./aioiTenantPartitionService');
const coordination = require('./aioiWorkerCoordinationService');
const parallelExec = require('./aioiParallelExecutionService');
const classificationConsumer = require('../aioiClassificationConsumerService');
const snapshotService = require('../aioiExecutiveQueueSnapshotProjectionService');
const runtimeMetrics = require('./aioiRuntimeMetricsService');
const distributedRuntime = require('./aioiDistributedRuntimeService');

function _workerModule() {
  return require('./aioiContinuousWorkerService');
}

const LAYER = 'AIOI_HORIZONTAL_ACTIVATION';
const NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const BENCHMARK_SCENARIOS = [3, 10, 25, 50];

const _soakState = {
  events_processed: 0,
  duplicates: 0,
  failed: 0,
  ownership_conflicts: 0,
  lease_conflicts: 0,
  cycles: 0,
  started_at: null
};

function _flag(name, defaultVal = 'false') {
  return String(process.env[name] || defaultVal).toLowerCase() === 'true';
}

function isRegistryActive() {
  return _flag('IMPETUS_AIOI_REGISTRY_ACTIVE');
}

function isParallelActive() {
  return _flag('IMPETUS_AIOI_PARALLEL_TENANT_EXECUTION');
}

function isOwnershipRuntimeActive() {
  return _flag('IMPETUS_AIOI_OWNERSHIP_RUNTIME_ACTIVE');
}

function getActivationFlags() {
  return {
    IMPETUS_AIOI_REGISTRY_ACTIVE: isRegistryActive(),
    IMPETUS_AIOI_PARALLEL_TENANT_EXECUTION: isParallelActive(),
    IMPETUS_AIOI_OWNERSHIP_RUNTIME_ACTIVE: isOwnershipRuntimeActive(),
    IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE: distributedRuntime.isDistributedActive(),
    IMPETUS_AIOI_WORKER_COUNT: distributedRuntime.getWorkerCount(),
    IMPETUS_AIOI_WORKER_ID: distributedRuntime.getWorkerId(),
    rollback_instant: true
  };
}

/**
 * Resolve tenants para ciclo operacional com fallback obrigatório.
 * @returns {{ tenants: string[], source: string, registry_active: boolean, fallback_used: boolean, fallback_reason?: string }}
 */
function resolveActiveTenants() {
  if (!isRegistryActive()) {
    const pilot = pilotFlags.validatePilotConfig();
    return {
      tenants: pilot.pilot_tenants || [],
      source: 'IMPETUS_AIOI_PILOT_TENANTS',
      registry_active: false,
      fallback_used: false
    };
  }

  try {
    const validation = tenantRegistry.validateTenantRegistry();
    const loaded = tenantRegistry.loadRegisteredTenants();
    const active = loaded.tenants || [];

    if (!validation.ok || active.length === 0) {
      const pilot = pilotFlags.validatePilotConfig();
      return {
        tenants: pilot.pilot_tenants || [],
        source: 'IMPETUS_AIOI_PILOT_TENANTS',
        registry_active: true,
        fallback_used: true,
        fallback_reason: !validation.ok ? 'registry_invalid' : 'registry_empty'
      };
    }

    if (!loaded.registry_enabled || loaded.source === 'IMPETUS_AIOI_PILOT_TENANTS') {
      return {
        tenants: active,
        source: 'IMPETUS_AIOI_PILOT_TENANTS',
        registry_active: true,
        fallback_used: true,
        fallback_reason: 'registry_empty'
      };
    }

    return {
      tenants: active,
      source: 'IMPETUS_AIOI_TENANT_REGISTRY',
      registry_active: true,
      fallback_used: false
    };
  } catch (err) {
    const pilot = pilotFlags.validatePilotConfig();
    return {
      tenants: pilot.pilot_tenants || [],
      source: 'IMPETUS_AIOI_PILOT_TENANTS',
      registry_active: true,
      fallback_used: true,
      fallback_reason: 'internal_error',
      error: err.message
    };
  }
}

/**
 * Tenants efetivos para o ciclo (parallel restringe a pilot).
 */
function resolveCycleTenants() {
  const resolution = resolveActiveTenants();
  if (isParallelActive()) {
    const pilot = pilotFlags.getPilotTenants();
    return {
      ...resolution,
      tenants: pilot,
      execution_mode: 'PARALLEL',
      pilot_only: true
    };
  }
  return {
    ...resolution,
    execution_mode: 'SEQUENTIAL',
    pilot_only: false
  };
}

function _getBatchSize() {
  const n = parseInt(String(process.env.IMPETUS_AIOI_OUTBOX_BATCH_SIZE || '10'), 10);
  return Math.min(Math.max(Number.isFinite(n) ? n : 10, 1), 100);
}

async function _processSingleTenant(companyId, runCount) {
  const classResult = await classificationConsumer.processClassificationBatch({
    companyId,
    batchSize: _getBatchSize()
  });

  const classified = classResult.processed || 0;
  const failed = classResult.failed || 0;

  runtimeMetrics.recordClassification({ processed: classified });

  let snapshotResult = { ok: false, skipped: true, reason: 'nothing_classified' };
  if (classified > 0 || !classResult.skipped) {
    snapshotResult = await snapshotService.projectExecutiveQueueSnapshot({
      companyId,
      tenantKey: companyId
    });
    if (snapshotResult.ok) {
      runtimeMetrics.recordSnapshotProjection(1);
    }
  }

  const shardId = isOwnershipRuntimeActive()
    ? partitionSvc.calculateTenantPartition(companyId)
    : null;

  return {
    company_id: companyId,
    classified,
    failed,
    snapshot_ok: snapshotResult.ok || false,
    snapshot_id: snapshotResult.snapshot_id || null,
    snapshot_items: snapshotResult.item_count || 0,
    shard_id: shardId
  };
}

/**
 * Executa pipeline por tenants (sequential ou parallel conforme flag).
 */
async function executeTenantPipeline({ tenants, runCount = 0 }) {
  const latencies = [];

  if (isParallelActive() && tenants.length > 1) {
    const start = Date.now();
    const result = await parallelExec.executeParallel({
      tenantIds: tenants,
      handler: async (companyId) => {
        const t0 = Date.now();
        const r = await _processSingleTenant(companyId, runCount);
        latencies.push(Date.now() - t0);
        return r;
      }
    });
    return {
      mode: 'PARALLEL',
      tenant_results: result.results.map(r => r.result),
      elapsed_ms: result.elapsed_ms,
      latencies
    };
  }

  const start = Date.now();
  const tenantResults = [];
  for (const companyId of tenants) {
    const t0 = Date.now();
    const r = await _processSingleTenant(companyId, runCount);
    latencies.push(Date.now() - t0);
    tenantResults.push(r);
  }
  return {
    mode: 'SEQUENTIAL',
    tenant_results: tenantResults,
    elapsed_ms: Date.now() - start,
    latencies
  };
}

/**
 * Ownership runtime — acquire leases observacionais (single worker).
 */
async function acquireOwnershipLeases() {
  if (distributedRuntime.isDistributedActive()) {
    return distributedRuntime.prepareDistributedCycle([]);
  }

  if (!isOwnershipRuntimeActive()) {
    return { active: false, leases: [] };
  }

  const owned = partitionSvc.calculateWorkerOwnership();
  const leases = [];
  for (const shardId of owned) {
    const r = await coordination.acquireWorkerLease({ shardId });
    leases.push({ shard_id: shardId, acquired: r.ok, lock_key: r.lease?.lock_key });
    if (!r.ok) _soakState.lease_conflicts += 1;
  }
  return { active: true, owned_shards: owned, leases };
}

async function releaseOwnershipLeases(leaseInfo) {
  if (distributedRuntime.isDistributedActive()) {
    return distributedRuntime.releaseDistributedLeases(leaseInfo);
  }
  if (!leaseInfo?.active || !leaseInfo.leases) return;
  for (const l of leaseInfo.leases) {
    if (l.acquired) await coordination.releaseWorkerLease(l.shard_id);
  }
}

function getOwnershipRuntimeState() {
  if (distributedRuntime.isDistributedActive()) {
    return distributedRuntime.getDistributedOwnershipState();
  }

  const assignments = partitionSvc.getPartitionAssignments();
  return {
    active: isOwnershipRuntimeActive(),
    worker_count: parseInt(String(process.env.IMPETUS_AIOI_WORKER_COUNT || '1'), 10) || 1,
    distributed: false,
    shard_count: assignments.shard_count,
    worker_id: assignments.worker_id,
    owned_shards: assignments.owned_shards,
    shards: assignments.shards,
    deterministic: true
  };
}

function _percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function _memMb() {
  return +(process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2);
}

function syntheticTenants(n) {
  const ids = [];
  for (let i = 0; i < n; i++) ids.push(uuidv5(`P1G-BENCH-${i}`, NS));
  return ids;
}

/**
 * Benchmark sequential vs parallel com handler real de classificação.
 */
async function runParallelBenchmark({ tenantIds } = {}) {
  const ids = tenantIds || pilotFlags.getPilotTenants();
  const handler = async (tenantId) => {
    const t0 = Date.now();
    await classificationConsumer.processClassificationBatch({
      companyId: tenantId,
      batchSize: _getBatchSize()
    });
    return { elapsed_ms: Date.now() - t0 };
  };

  const cpuBefore = process.cpuUsage();
  const memBefore = _memMb();
  const seqStart = Date.now();
  const sequential = await parallelExec.executeSequential({ tenantIds: ids, handler });
  const seqCpu = process.cpuUsage(cpuBefore);
  const seqMem = _memMb();
  const seqLatencies = sequential.results.map(r => r.elapsed_ms);

  const cpuBeforePar = process.cpuUsage();
  const memBeforePar = _memMb();
  const parallel = await parallelExec.executeParallel({ tenantIds: ids, handler });
  const parCpu = process.cpuUsage(cpuBeforePar);
  const parMem = _memMb();
  const parLatencies = parallel.results.map(r => r.elapsed_ms);

  const seqElapsed = Math.max(sequential.elapsed_ms, 1);
  const parElapsed = Math.max(parallel.elapsed_ms, 1);

  return {
    tenant_count: ids.length,
    sequential: {
      throughput_eps: +(ids.length / (seqElapsed / 1000)).toFixed(2),
      latency_p95_ms: _percentile(seqLatencies, 95),
      memory_mb: seqMem,
      cpu_ms: +((seqCpu.user + seqCpu.system) / 1000).toFixed(2),
      elapsed_ms: sequential.elapsed_ms
    },
    parallel: {
      throughput_eps: +(ids.length / (parElapsed / 1000)).toFixed(2),
      latency_p95_ms: _percentile(parLatencies, 95),
      memory_mb: parMem,
      cpu_ms: +((parCpu.user + parCpu.system) / 1000).toFixed(2),
      elapsed_ms: parallel.elapsed_ms
    }
  };
}

/**
 * Runtime benchmark por volume (3/10/25/50).
 */
async function runRuntimeBenchmark() {
  const scenarios = {};
  const pilot = pilotFlags.getPilotTenants();

  for (const n of BENCHMARK_SCENARIOS) {
    const tenantIds = n <= pilot.length
      ? pilot.slice(0, n)
      : [...pilot, ...syntheticTenants(n - pilot.length)];

    const cpuBefore = process.cpuUsage();
    const memBefore = _memMb();
    const latencies = [];

    const t0 = Date.now();
    for (const tid of tenantIds) {
      const ts = Date.now();
      await classificationConsumer.processClassificationBatch({
        companyId: tid,
        batchSize: _getBatchSize()
      });
      latencies.push(Date.now() - ts);
    }
    const elapsed = Date.now() - t0;
    const cpu = process.cpuUsage(cpuBefore);

    scenarios[n] = {
      tenant_count: n,
      latency_p50: _percentile(latencies, 50),
      latency_p95: _percentile(latencies, 95),
      latency_p99: _percentile(latencies, 99),
      throughput_eps: +(tenantIds.length / Math.max(elapsed / 1000, 0.001)).toFixed(2),
      memory_mb: _memMb(),
      cpu_ms: +((cpu.user + cpu.system) / 1000).toFixed(2),
      elapsed_ms: elapsed
    };
  }

  return {
    registry_off: await _benchmarkWithFlags({ IMPETUS_AIOI_REGISTRY_ACTIVE: 'false' }, pilot),
    registry_on: await _benchmarkWithFlags({ IMPETUS_AIOI_REGISTRY_ACTIVE: 'true', IMPETUS_AIOI_TENANT_REGISTRY: pilot.join(',') }, pilot),
    sequential: scenarios,
    parallel: await runParallelBenchmark({ tenantIds: pilot }),
    ownership_off: { active: false, worker_count: 1 },
    ownership_on: getOwnershipRuntimeState()
  };
}

async function _benchmarkWithFlags(envOverrides, pilot) {
  const saved = {};
  for (const k of Object.keys(envOverrides)) {
    saved[k] = process.env[k];
    process.env[k] = envOverrides[k];
  }
  try {
    const resolution = resolveActiveTenants();
    const t0 = Date.now();
    for (const tid of resolution.tenants.slice(0, 3)) {
      await classificationConsumer.processClassificationBatch({ companyId: tid, batchSize: _getBatchSize() });
    }
    return {
      source: resolution.source,
      tenant_count: resolution.tenants.length,
      elapsed_ms: Date.now() - t0,
      fallback_used: resolution.fallback_used
    };
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

function recordSoakCycle({ classified = 0, failed = 0, duplicates = 0, ownership_conflicts = 0, lease_conflicts = 0 }) {
  if (!_soakState.started_at) _soakState.started_at = new Date().toISOString();
  _soakState.events_processed += classified;
  _soakState.failed += failed;
  _soakState.duplicates += duplicates;
  _soakState.ownership_conflicts += ownership_conflicts;
  _soakState.lease_conflicts += lease_conflicts;
  _soakState.cycles += 1;
}

function getSoakMetrics() {
  return { ..._soakState, mode: 'MEC-SOAK-equivalent' };
}

function resetSoakMetrics() {
  _soakState.events_processed = 0;
  _soakState.duplicates = 0;
  _soakState.failed = 0;
  _soakState.ownership_conflicts = 0;
  _soakState.lease_conflicts = 0;
  _soakState.cycles = 0;
  _soakState.started_at = null;
}

async function getRuntimeStatus() {
  const continuousWorker = _workerModule();
  const workerStatus = continuousWorker.getWorkerStatus();
  const resolution = resolveActiveTenants();
  const cycleResolution = resolveCycleTenants();
  const ownership = getOwnershipRuntimeState();
  const cluster = await coordination.getClusterStatus();
  const flags = getActivationFlags();

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    activation_flags: flags,
    tenant_resolution: resolution,
    cycle_resolution: cycleResolution,
    ownership_runtime: ownership,
    coordination: cluster,
    worker: {
      run_count: workerStatus.run_count,
      worker_running: workerStatus.worker_running,
      last_run: workerStatus.last_run,
      advisory_lock_key: continuousWorker.ADVISORY_LOCK_KEY,
      p1a_lock_preserved: true
    },
    runtime_invariants: continuousWorker.RUNTIME_INVARIANTS,
    soak_metrics: getSoakMetrics(),
    hostname: os.hostname(),
    timestamp: new Date().toISOString()
  };
}

async function getRegistryStatus() {
  const resolution = resolveActiveTenants();
  const loaded = tenantRegistry.loadRegisteredTenants();
  const validation = tenantRegistry.validateTenantRegistry();

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    registry_active: isRegistryActive(),
    resolution,
    registry: loaded,
    validation,
    pilot_tenants: pilotFlags.getPilotTenants(),
    rollback: 'Set IMPETUS_AIOI_REGISTRY_ACTIVE=false',
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  isRegistryActive,
  isParallelActive,
  isOwnershipRuntimeActive,
  getActivationFlags,
  resolveActiveTenants,
  resolveCycleTenants,
  executeTenantPipeline,
  acquireOwnershipLeases,
  releaseOwnershipLeases,
  getOwnershipRuntimeState,
  runParallelBenchmark,
  runRuntimeBenchmark,
  recordSoakCycle,
  getSoakMetrics,
  resetSoakMetrics,
  getRuntimeStatus,
  getRegistryStatus,
  LAYER
};
