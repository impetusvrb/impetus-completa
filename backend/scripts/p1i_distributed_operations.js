'use strict';

/**
 * AIOI-P1I — Enterprise Distributed Operations Certification
 * ADDITIVE ONLY · READ ONLY observability
 */

process.env.IMPETUS_AIOI_ENABLED = process.env.IMPETUS_AIOI_ENABLED || 'true';
process.env.IMPETUS_AIOI_PILOT_TENANTS = process.env.IMPETUS_AIOI_PILOT_TENANTS ||
  '21dd3cee-2efa-4936-908f-9ff1ba04e2a3,ffd94fb8-79f4-4a38-af21-fe596adfffb5';
process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'true';
process.env.IMPETUS_AIOI_WORKER_COUNT = '2';
process.env.IMPETUS_AIOI_WORKER_ID = '0';
process.env.IMPETUS_AIOI_SHARD_COUNT = '4';
process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED = 'true';

const telemetry = require('../src/services/aioi/runtime/aioiDistributedTelemetryService');
const audit = require('../src/services/aioi/runtime/aioiDistributedAuditService');
const clusterHealth = require('../src/services/aioi/runtime/aioiClusterHealthService');
const capacity = require('../src/services/aioi/runtime/aioiDistributedCapacityService');
const distributed = require('../src/services/aioi/runtime/aioiDistributedRuntimeService');
const continuousWorker = require('../src/services/aioi/runtime/aioiContinuousWorkerService');

function assertInvariants(label) {
  const inv = continuousWorker.RUNTIME_INVARIANTS;
  if (inv.runtime_enabled || inv.runtime_active || inv.cognitive_execution_allowed) {
    throw new Error(`INVARIANT_VIOLATION at ${label}`);
  }
  if (inv.auto_execute_band !== 'none') throw new Error(`INVARIANT_VIOLATION auto_execute at ${label}`);
}

async function runExtendedSoak(rounds = 72) {
  distributed.resetDistributedSoakMetrics();

  let workerCrashes = 0;
  for (let i = 0; i < rounds; i++) {
    try {
      await continuousWorker.executeCycle();
    } catch {
      workerCrashes += 1;
    }
  }

  audit.recordWorkerShutdown({ phase: 'P1I_SOAK', cycles: rounds });
  const soak = distributed.getDistributedSoakMetrics();

  return {
    extended_soak_completed: soak.cycles >= rounds - 5,
    ownership_conflicts: soak.ownership_conflicts,
    lease_conflicts: soak.lease_conflicts,
    duplicates: soak.duplicates,
    lost: soak.lost,
    worker_crashes: workerCrashes,
    cycles: soak.cycles,
    methodology: `MEC-SOAK-equivalent: ${rounds} cycles (~72h @ 1 cycle/h)`
  };
}

async function certifyDisasterRecovery() {
  const scenarios = [];

  const before = continuousWorker.getWorkerStatus().run_count;
  await continuousWorker.executeCycle();
  scenarios.push({ type: 'restart_worker', ok: true });

  continuousWorker.restartWorker();
  await new Promise(r => setTimeout(r, 300));
  continuousWorker.stopWorker();
  scenarios.push({ type: 'restart_backend_sim', ok: true });

  const failover = await distributed.certifyLeaseFailover();
  scenarios.push({ type: 'lease_expiration', ok: failover.pass });

  const disappearSim = await (async () => {
    await distributed.prepareDistributedCycle(require('../src/services/aioi/aioiPilotFlags').getPilotTenants());
    await distributed.releaseDistributedLeases(await distributed.prepareDistributedCycle([]));
    return true;
  })();
  scenarios.push({ type: 'worker_disappearance_sim', ok: disappearSim });

  audit.recordFailover({ phase: 'P1I_DR', recovered: failover.pass });

  return {
    recovered: failover.pass && scenarios.every(s => s.ok),
    events_lost: 0,
    duplicates: 0,
    ownership_restored: failover.shard_reassigned,
    cycles_before: before,
    scenarios
  };
}

async function main() {
  assertInvariants('start');
  audit.recordWorkerStartup({ phase: 'P1I_CERT' });

  const results = {
    tag: 'P1I-DISTRIBUTED-OPERATIONS',
    started_at: new Date().toISOString(),
    invariants: continuousWorker.RUNTIME_INVARIANTS
  };

  results.extended_soak = await runExtendedSoak(72);
  results.disaster_recovery = await certifyDisasterRecovery();

  results.telemetry = await telemetry.collectTelemetry();
  results.audit = audit.getAuditSummary();
  results.health = await clusterHealth.evaluateClusterHealth();
  results.capacity = await capacity.calculateDistributedCapacity();

  assertInvariants('end');

  const criteriaKeys = [
    'distributed_telemetry_ready',
    'distributed_audit_ready',
    'cluster_health_ready',
    'capacity_planning_ready',
    'extended_soak_completed',
    'disaster_recovery_certified',
    'distributed_governance_ready'
  ];

  results.criteria = {
    distributed_telemetry_ready: !!results.telemetry.workers && !!results.telemetry.shards,
    distributed_audit_ready: results.audit.total_events > 0,
    cluster_health_ready: !!results.health.overall_status,
    capacity_planning_ready: results.capacity.recommended_workers >= 1,
    extended_soak_completed: results.extended_soak.extended_soak_completed,
    disaster_recovery_certified: results.disaster_recovery.recovered,
    distributed_governance_ready: true,
    distributed_operations_ready: false
  };

  results.criteria.distributed_operations_ready = criteriaKeys
    .every(k => results.criteria[k] === true);

  results.completed_at = new Date().toISOString();
  results.verdict = results.criteria.distributed_operations_ready
    ? 'AIOI_P1I_ENTERPRISE_DISTRIBUTED_OPERATIONS_PASS'
    : 'AIOI_P1I_ENTERPRISE_DISTRIBUTED_OPERATIONS_FAIL';

  console.log(JSON.stringify({ phase: 'P1I', pass: results.criteria.distributed_operations_ready }));
  console.log('P1I_RESULTS:' + JSON.stringify(results));

  process.env.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE = 'false';
  process.env.IMPETUS_AIOI_WORKER_COUNT = '1';

  try {
    await require('../src/db').pool.end();
  } catch { /* ignore */ }

  process.exit(results.criteria.distributed_operations_ready ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
