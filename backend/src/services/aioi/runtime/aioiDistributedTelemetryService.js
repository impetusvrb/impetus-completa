'use strict';

/**
 * AIOI-P1I.1 — Distributed Runtime Telemetry
 * READ ONLY · observação distribuída.
 */

const os = require('os');
const distributedRuntime = require('./aioiDistributedRuntimeService');
const partitionSvc = require('./aioiTenantPartitionService');
const coordination = require('./aioiWorkerCoordinationService');
const tenantRegistry = require('./aioiTenantRegistryService');
const horizontalActivation = require('./aioiHorizontalActivationService');
const runtimeMetrics = require('./aioiRuntimeMetricsService');

const LAYER = 'AIOI_DISTRIBUTED_TELEMETRY';

function _workerModule() {
  return require('./aioiContinuousWorkerService');
}

function collectWorkerMetrics() {
  const workerStatus = _workerModule().getWorkerStatus();
  const flags = distributedRuntime.getDistributedFlags();
  const wc = flags.IMPETUS_AIOI_WORKER_COUNT || 1;
  const workers = [];

  for (let w = 0; w < wc; w++) {
    workers.push({
      worker_id: w,
      is_local: w === flags.IMPETUS_AIOI_WORKER_ID,
      owned_shards: partitionSvc.calculateWorkerOwnership(w, Math.max(wc, parseInt(process.env.IMPETUS_AIOI_SHARD_COUNT || wc, 10) || wc)),
      available: w === flags.IMPETUS_AIOI_WORKER_ID ? workerStatus.worker_running : null,
      run_count: w === flags.IMPETUS_AIOI_WORKER_ID ? workerStatus.run_count : null
    });
  }

  return {
    worker_count: wc,
    local_worker_id: flags.IMPETUS_AIOI_WORKER_ID,
    distributed_active: flags.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE,
    workers,
    hostname: os.hostname(),
    pid: process.pid
  };
}

function collectShardMetrics() {
  const assignments = partitionSvc.getPartitionAssignments();
  const wc = distributedRuntime.getWorkerCount();
  const sc = assignments.shard_count || 1;

  const shards = (assignments.shards || []).map(s => ({
    shard_id: s.shard_id,
    worker_id: s.worker_id,
    tenant_count: (s.tenants || []).length,
    tenants_sample: (s.tenants || []).slice(0, 2).map(t => String(t).slice(0, 8))
  }));

  const validation = distributedRuntime.validateShardOwnership(wc, sc);

  const tenantTotal = shards.reduce((n, s) => n + (s.tenant_count || 0), 0);
  const counts = shards.map(s => s.tenant_count || 0);
  const maxC = Math.max(...counts, 0);
  const minC = maxC > 0 ? Math.min(...counts) : 0;

  return {
    shard_count: sc,
    shards,
    tenant_total: tenantTotal,
    balance_ratio: maxC > 0 ? +(minC / maxC).toFixed(2) : 1,
    ownership_validation: validation
  };
}

async function collectLeaseMetrics() {
  const cluster = await coordination.getClusterStatus();
  const localLeases = cluster.active_leases_in_process || [];
  const dbLocks = cluster.advisory_locks_db || [];

  return {
    mode: cluster.mode,
    local_leases: localLeases.map(l => ({
      shard_id: l.shard_id,
      lock_key: l.lock_key,
      acquired_at: l.acquired_at,
      renew_count: l.renew_count || 0,
      age_ms: l.acquired_at ? Date.now() - new Date(l.acquired_at).getTime() : null
    })),
    db_advisory_locks: dbLocks.length,
    coordination_ready: cluster.coordination_ready,
    p1a_lock_preserved: cluster.replaces_p1a_advisory_lock === false
  };
}

function collectThroughputMetrics() {
  const metrics = runtimeMetrics.getMetricsSummary();
  const soak = distributedRuntime.getDistributedSoakMetrics();
  const haSoak = horizontalActivation.getSoakMetrics();

  return {
    cycles_total: soak.cycles + haSoak.cycles,
    events_processed: soak.events_processed + haSoak.events_processed,
    classification_total: metrics.classification_total || 0,
    cycle_latency_p95_ms: metrics.cycle_latency_p95_ms || 0,
    distributed_soak: soak,
    horizontal_soak: haSoak
  };
}

async function collectClusterMetrics() {
  const cluster = await coordination.getClusterStatus();
  const dist = await distributedRuntime.getDistributedStatus();

  return {
    shard_count: dist.ownership?.shard_count || 1,
    worker_count: dist.flags?.IMPETUS_AIOI_WORKER_COUNT || 1,
    distributed: dist.flags?.distributed || false,
    worker_distribution: dist.worker_distribution || {},
    coordination: {
      mode: cluster.mode,
      distributed_active: cluster.distributed_active
    },
    soak_metrics: dist.soak_metrics
  };
}

async function collectTelemetry() {
  const workers = collectWorkerMetrics();
  const shards = collectShardMetrics();
  const leases = await collectLeaseMetrics();
  const throughput = collectThroughputMetrics();
  const cluster = await collectClusterMetrics();

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    workers,
    shards,
    leases,
    throughput,
    cluster,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  collectWorkerMetrics,
  collectShardMetrics,
  collectLeaseMetrics,
  collectThroughputMetrics,
  collectClusterMetrics,
  collectTelemetry,
  LAYER
};
