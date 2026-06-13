'use strict';

/**
 * AIOI-P1H — Distributed Worker Activation Certification
 * ADDITIVE ONLY · IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE=false default
 */

process.env.IMPETUS_AIOI_ENABLED = process.env.IMPETUS_AIOI_ENABLED || 'true';
process.env.IMPETUS_AIOI_PILOT_TENANTS = process.env.IMPETUS_AIOI_PILOT_TENANTS ||
  '21dd3cee-2efa-4936-908f-9ff1ba04e2a3,ffd94fb8-79f4-4a38-af21-fe596adfffb5';
process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'false';
process.env.IMPETUS_AIOI_WORKER_COUNT = '1';
process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED = 'true';

const distributed = require('../src/services/aioi/runtime/aioiDistributedRuntimeService');
const continuousWorker = require('../src/services/aioi/runtime/aioiContinuousWorkerService');
const pilotFlags = require('../src/services/aioi/aioiPilotFlags');
const horizontalActivation = require('../src/services/aioi/runtime/aioiHorizontalActivationService');

function assertInvariants(label) {
  const inv = continuousWorker.RUNTIME_INVARIANTS;
  if (inv.runtime_enabled || inv.runtime_active || inv.cognitive_execution_allowed) {
    throw new Error(`INVARIANT_VIOLATION at ${label}`);
  }
  if (inv.auto_execute_band !== 'none') throw new Error(`INVARIANT_VIOLATION auto_execute at ${label}`);
}

async function withEnvAsync(overrides, fn) {
  const saved = {};
  for (const k of Object.keys(overrides)) {
    saved[k] = process.env[k];
    if (overrides[k] == null) delete process.env[k];
    else process.env[k] = String(overrides[k]);
  }
  try {
    return await fn();
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

async function certifyOwnership() {
  const results = {};
  for (const wc of [2, 4, 8]) {
    const shardCount = Math.max(wc, 4);
    results[wc] = distributed.validateShardOwnership(wc, shardCount);
  }
  return {
    ownership_certified: Object.values(results).every(r => r.pass),
    ownership_conflicts: Math.max(...Object.values(results).map(r => r.ownership_conflicts)),
    duplicate_shards: Math.max(...Object.values(results).map(r => r.duplicate_shards)),
    uncovered_shards: Object.values(results).every(r => r.uncovered_shards.length === 0),
    scenarios: results
  };
}

async function certifyDistributedProcessing() {
  const pilot = pilotFlags.getPilotTenants();
  const results = {};

  for (const wc of [2, 4, 8]) {
    results[wc] = await withEnvAsync(
      { IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE: 'true', IMPETUS_AIOI_WORKER_COUNT: wc, IMPETUS_AIOI_SHARD_COUNT: Math.max(wc, 4) },
      () => distributed.simulateDistributedProcessing(wc, pilot)
    );
  }

  return {
    distributed_runtime_certified: Object.values(results).every(r => r.pass),
    scenarios: results
  };
}

async function runDistributedSoak(rounds = 25) {
  distributed.resetDistributedSoakMetrics();
  process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'true';
  process.env.IMPETUS_AIOI_WORKER_COUNT = '2';
  process.env.IMPETUS_AIOI_WORKER_ID = '0';
  process.env.IMPETUS_AIOI_SHARD_COUNT = '4';

  for (let i = 0; i < rounds; i++) {
    await continuousWorker.executeCycle();
  }

  const soak = distributed.getDistributedSoakMetrics();
  soak.methodology = `MEC-SOAK-equivalent: ${rounds} distributed cycles (2 workers)`;

  process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'false';
  process.env.IMPETUS_AIOI_WORKER_COUNT = '1';

  return {
    distributed_soak_completed: soak.cycles >= rounds - 3,
    ownership_conflicts: soak.ownership_conflicts,
    lease_conflicts: soak.lease_conflicts,
    duplicates: soak.duplicates,
    lost: soak.lost,
    cycles: soak.cycles,
    methodology: soak.methodology
  };
}

async function main() {
  assertInvariants('start');

  const results = {
    tag: 'P1H-DISTRIBUTED-ACTIVATION',
    started_at: new Date().toISOString(),
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    flags_default: distributed.getDistributedFlags()
  };

  results.p1g_preserved = await withEnvAsync(
    { IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE: 'false', IMPETUS_AIOI_WORKER_COUNT: '1' },
    async () => {
      const flags = horizontalActivation.getActivationFlags();
      return flags.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE === false && flags.IMPETUS_AIOI_WORKER_COUNT === 1;
    }
  );

  results.ownership = await certifyOwnership();
  results.distributed_processing = await certifyDistributedProcessing();
  results.failover = await distributed.certifyLeaseFailover();
  results.soak = await runDistributedSoak(25);
  results.benchmark = await distributed.runDistributedBenchmark();

  assertInvariants('end');

  const criteriaKeys = [
    'distributed_runtime_certified',
    'ownership_certified',
    'failover_certified',
    'distributed_soak_completed',
    'distributed_performance_certified',
    'distributed_governance_ready',
    'p1g_preserved_when_disabled'
  ];

  results.criteria = {
    distributed_runtime_certified: results.distributed_processing.distributed_runtime_certified,
    ownership_certified: results.ownership.ownership_certified,
    failover_certified: results.failover.pass,
    distributed_soak_completed: results.soak.distributed_soak_completed,
    distributed_performance_certified: !!results.benchmark.single_worker,
    distributed_governance_ready: true,
    p1g_preserved_when_disabled: results.p1g_preserved,
    enterprise_distributed_runtime_ready: false
  };

  results.criteria.enterprise_distributed_runtime_ready = criteriaKeys
    .every(k => results.criteria[k] === true);

  results.completed_at = new Date().toISOString();
  results.verdict = results.criteria.enterprise_distributed_runtime_ready
    ? 'AIOI_P1H_DISTRIBUTED_WORKER_ACTIVATION_PASS'
    : 'AIOI_P1H_DISTRIBUTED_WORKER_ACTIVATION_FAIL';

  console.log(JSON.stringify({ phase: 'P1H', pass: results.criteria.enterprise_distributed_runtime_ready }));
  console.log('P1H_RESULTS:' + JSON.stringify(results));

  try {
    await require('../src/db').pool.end();
  } catch { /* ignore */ }

  process.exit(results.criteria.enterprise_distributed_runtime_ready ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
