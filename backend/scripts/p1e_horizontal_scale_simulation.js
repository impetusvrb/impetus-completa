'use strict';

/**
 * AIOI-P1E.5 — Horizontal Scale Simulation
 * ADDITIVE ONLY — não altera produção.
 */

const { v5: uuidv5 } = require('uuid');
const tenantRegistry = require('../src/services/aioi/runtime/aioiTenantRegistryService');
const partitionSvc = require('../src/services/aioi/runtime/aioiTenantPartitionService');
const coordination = require('../src/services/aioi/runtime/aioiWorkerCoordinationService');
const parallelExec = require('../src/services/aioi/runtime/aioiParallelExecutionService');
const continuousWorker = require('../src/services/aioi/runtime/aioiContinuousWorkerService');

const NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const SIM_COUNTS = [10, 25, 50, 100];

function syntheticTenants(n) {
  const ids = [];
  for (let i = 0; i < n; i++) {
    ids.push(uuidv5(`P1E-SIM-TENANT-${i}`, NS));
  }
  return ids;
}

function simulatePartitions(tenantIds, shardCount = 4) {
  const t0 = Date.now();
  const shards = Array.from({ length: shardCount }, () => ({ count: 0, tenants: [] }));
  for (const tid of tenantIds) {
    const p = partitionSvc.calculateTenantPartition(tid, shardCount);
    shards[p].count++;
    if (shards[p].tenants.length < 3) shards[p].tenants.push(tid.slice(0, 8));
  }
  return {
    shard_count: shardCount,
    elapsed_ms: Date.now() - t0,
    distribution: shards.map((s, i) => ({ shard_id: i, tenant_count: s.count, sample: s.tenants })),
    balance_ratio: shards.length
      ? +(Math.min(...shards.map(s => s.count)) / Math.max(...shards.map(s => s.count) || 1)).toFixed(2)
      : 1
  };
}

async function simulateLoopLatency(tenantIds) {
  const handler = async () => ({ processed: 0, skipped: true });
  const seq = await parallelExec.executeSequential({ tenantIds, handler });
  const par = await parallelExec.executeParallel({ tenantIds, handler });
  return {
    sequential_ms: seq.elapsed_ms,
    parallel_ms: par.elapsed_ms,
    speedup: seq.elapsed_ms > 0 ? +(seq.elapsed_ms / par.elapsed_ms).toFixed(2) : 1,
    per_tenant_sequential_ms: tenantIds.length ? Math.round(seq.elapsed_ms / tenantIds.length) : 0
  };
}

async function main() {
  const results = {
    tag: 'P1E-HORIZONTAL-SCALE-SIM',
    started_at: new Date().toISOString(),
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    registry_baseline: tenantRegistry.loadRegisteredTenants(),
    simulations: {}
  };

  const memBefore = process.memoryUsage();

  for (const n of SIM_COUNTS) {
    const tenantIds = syntheticTenants(n);
    const partitions = simulatePartitions(tenantIds, Math.min(4, Math.ceil(n / 10)));
    const loop = await simulateLoopLatency(tenantIds);
    results.simulations[n] = {
      tenant_count: n,
      partitions,
      loop_latency: loop,
      estimated_cycle_ms_sequential: loop.sequential_ms,
      estimated_cycle_ms_parallel: loop.parallel_ms
    };
    console.log(JSON.stringify({ phase: 'P1E_SIM', tenants: n, seq_ms: loop.sequential_ms, par_ms: loop.parallel_ms }));
  }

  const coordStart = Date.now();
  const lease = await coordination.acquireWorkerLease({ shardId: 0 });
  const cluster = await coordination.getClusterStatus();
  if (lease.ok) await coordination.releaseWorkerLease(0);
  results.coordination_overhead_ms = Date.now() - coordStart;
  results.cluster_status = cluster;

  const memAfter = process.memoryUsage();
  results.memory = {
    heap_used_mb: +((memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024)).toFixed(2),
    rss_mb: +(memAfter.rss / (1024 * 1024)).toFixed(2)
  };

  results.completed_at = new Date().toISOString();
  console.log('P1E_SIM_RESULTS:' + JSON.stringify(results));

  try {
    await require('../src/db').pool.end();
  } catch { /* ignore */ }
  process.exit(0);
}

main().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
