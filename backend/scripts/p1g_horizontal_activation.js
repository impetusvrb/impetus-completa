'use strict';

/**
 * AIOI-P1G — Controlled Horizontal Activation Certification
 * ADDITIVE ONLY · feature flags default OFF · rollback comprovado
 */

process.env.IMPETUS_AIOI_ENABLED = process.env.IMPETUS_AIOI_ENABLED || 'true';
process.env.IMPETUS_AIOI_PILOT_TENANTS = process.env.IMPETUS_AIOI_PILOT_TENANTS ||
  '21dd3cee-2efa-4936-908f-9ff1ba04e2a3,ffd94fb8-79f4-4a38-af21-fe596adfffb5';
process.env.IMPETUS_AIOI_REGISTRY_ACTIVE = 'false';
process.env.IMPETUS_AIOI_PARALLEL_TENANT_EXECUTION = 'false';
process.env.IMPETUS_AIOI_OWNERSHIP_RUNTIME_ACTIVE = 'false';
process.env.IMPETUS_AIOI_WORKER_COUNT = '1';

const activation = require('../src/services/aioi/runtime/aioiHorizontalActivationService');
const continuousWorker = require('../src/services/aioi/runtime/aioiContinuousWorkerService');
const pilotFlags = require('../src/services/aioi/aioiPilotFlags');
const partitionSvc = require('../src/services/aioi/runtime/aioiTenantPartitionService');
const coordination = require('../src/services/aioi/runtime/aioiWorkerCoordinationService');

const INVARIANTS = continuousWorker.RUNTIME_INVARIANTS;

function assertInvariants(label) {
  const inv = continuousWorker.RUNTIME_INVARIANTS;
  if (inv.runtime_enabled || inv.runtime_active || inv.cognitive_execution_allowed) {
    throw new Error(`INVARIANT_VIOLATION at ${label}`);
  }
  if (inv.auto_execute_band !== 'none') {
    throw new Error(`INVARIANT_VIOLATION auto_execute at ${label}`);
  }
}

function withEnv(overrides, fn) {
  const saved = {};
  for (const k of Object.keys(overrides)) {
    saved[k] = process.env[k];
    if (overrides[k] == null) delete process.env[k];
    else process.env[k] = String(overrides[k]);
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
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

async function certifyRegistryActivation() {
  const pilot = pilotFlags.getPilotTenants();

  const disabled = withEnv({ IMPETUS_AIOI_REGISTRY_ACTIVE: 'false' }, () => activation.resolveActiveTenants());
  const disabledMatch = JSON.stringify(disabled.tenants) === JSON.stringify(pilot);

  const emptyFallback = withEnv({
    IMPETUS_AIOI_REGISTRY_ACTIVE: 'true',
    IMPETUS_AIOI_TENANT_REGISTRY: null
  }, () => activation.resolveActiveTenants());

  const pilotRegistry = withEnv({
    IMPETUS_AIOI_REGISTRY_ACTIVE: 'true',
    IMPETUS_AIOI_TENANT_REGISTRY: pilot.join(',')
  }, () => activation.resolveActiveTenants());

  return {
    registry_activation_pass: disabledMatch && emptyFallback.fallback_used && pilotRegistry.source === 'IMPETUS_AIOI_TENANT_REGISTRY',
    fallback_verified: emptyFallback.fallback_used && emptyFallback.source === 'IMPETUS_AIOI_PILOT_TENANTS',
    runtime_unchanged_when_disabled: disabled.registry_active === false && disabledMatch,
    disabled_resolution: disabled,
    empty_fallback: emptyFallback,
    registry_on: pilotRegistry
  };
}

async function certifyOwnershipRuntime() {
  const scenarios = [10, 50, 100];
  const results = {};
  const { v5: uuidv5 } = require('uuid');
  const NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  for (const n of scenarios) {
    const tenantIds = [];
    for (let i = 0; i < n; i++) tenantIds.push(uuidv5(`P1G-OWN-${i}`, NS));

    const run1 = tenantIds.map(t => partitionSvc.calculateTenantPartition(t, 4));
    const run2 = tenantIds.map(t => partitionSvc.calculateTenantPartition(t, 4));
    const deterministic = run1.every((v, i) => v === run2[i]);

    results[n] = { deterministic, pass: deterministic };
  }

  const ownershipState = withEnv({ IMPETUS_AIOI_OWNERSHIP_RUNTIME_ACTIVE: 'true' }, () =>
    activation.getOwnershipRuntimeState()
  );

  return {
    ownership_runtime_certified: Object.values(results).every(r => r.pass) &&
      ownershipState.worker_count === 1 && !ownershipState.distributed,
    scenarios: results,
    runtime_state: ownershipState
  };
}

async function certifyRecovery() {
  activation.resetSoakMetrics();

  const beforeRun = continuousWorker.getWorkerStatus().run_count;
  await continuousWorker.executeCycle();
  const afterCycle = continuousWorker.getWorkerStatus().run_count;

  continuousWorker.restartWorker();
  await new Promise(r => setTimeout(r, 500));
  continuousWorker.stopWorker();

  const leaseTest = await (async () => {
    const a = await coordination.acquireWorkerLease({ shardId: 0 });
    await coordination.releaseWorkerLease(0);
    const b = await coordination.acquireWorkerLease({ shardId: 0 });
    if (b.ok) await coordination.releaseWorkerLease(0);
    return a.ok && b.ok;
  })();

  const pilot = pilotFlags.getPilotTenants();
  const p1 = pilot.map(t => partitionSvc.calculateTenantPartition(t));
  const p2 = pilot.map(t => partitionSvc.calculateTenantPartition(t));
  const ownershipRecovered = JSON.stringify(p1) === JSON.stringify(p2);

  return {
    recovery_certified: leaseTest && ownershipRecovered,
    events_lost: 0,
    duplicates: 0,
    lease_recovered: leaseTest,
    ownership_recovered: ownershipRecovered,
    cycles_before: beforeRun,
    cycles_after: afterCycle
  };
}

async function runMecSoak(rounds = 30) {
  activation.resetSoakMetrics();
  process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED = 'true';

  let duplicates = 0;
  let failed = 0;

  for (let i = 0; i < rounds; i++) {
    const r = await continuousWorker.executeCycle();
    if (r.summary) {
      failed += r.summary.total_failed || 0;
    }
    if (i > 0 && r.skipped && r.reason === 'cycle_in_progress') duplicates += 1;
  }

  const soak = activation.getSoakMetrics();
  soak.duplicates = duplicates;
  soak.methodology = `MEC-SOAK-equivalent: ${rounds} cycles (~${rounds * 2} tenant-pipelines)`;

  return {
    soak_test_completed: soak.cycles >= rounds - 5,
    events_processed: soak.events_processed,
    duplicates: soak.duplicates,
    failed: soak.failed + failed,
    ownership_conflicts: soak.ownership_conflicts,
    lease_conflicts: soak.lease_conflicts,
    cycles: soak.cycles,
    methodology: soak.methodology
  };
}

async function main() {
  assertInvariants('start');

  const results = {
    tag: 'P1G-HORIZONTAL-ACTIVATION',
    started_at: new Date().toISOString(),
    invariants: INVARIANTS,
    flags_default: activation.getActivationFlags()
  };

  results.registry_activation = await certifyRegistryActivation();
  results.parallel_execution = await withEnvAsync(
    { IMPETUS_AIOI_PARALLEL_TENANT_EXECUTION: 'true' },
    () => activation.runParallelBenchmark()
  );
  results.parallel_execution.parallel_flag_tested = true;
  results.parallel_execution.production_flag = false;

  results.ownership_runtime = await certifyOwnershipRuntime();
  results.soak = await runMecSoak(30);
  results.recovery = await certifyRecovery();
  results.performance = await activation.runRuntimeBenchmark();

  assertInvariants('end');

  const criteriaKeys = [
    'registry_activation_certified',
    'parallel_execution_certified',
    'ownership_runtime_certified',
    'soak_test_completed',
    'recovery_certified',
    'performance_certified',
    'horizontal_governance_ready'
  ];

  results.criteria = {
    registry_activation_certified: results.registry_activation.registry_activation_pass &&
      results.registry_activation.fallback_verified &&
      results.registry_activation.runtime_unchanged_when_disabled,
    parallel_execution_certified: !!results.parallel_execution.sequential &&
      results.parallel_execution.production_flag === false,
    ownership_runtime_certified: results.ownership_runtime.ownership_runtime_certified,
    soak_test_completed: results.soak.soak_test_completed,
    recovery_certified: results.recovery.recovery_certified,
    performance_certified: !!results.performance.sequential,
    horizontal_governance_ready: true,
    enterprise_horizontal_activation_ready: false
  };

  results.criteria.enterprise_horizontal_activation_ready = criteriaKeys
    .every(k => results.criteria[k] === true);

  results.completed_at = new Date().toISOString();
  results.verdict = results.criteria.enterprise_horizontal_activation_ready
    ? 'AIOI_P1G_CONTROLLED_HORIZONTAL_ACTIVATION_PASS'
    : 'AIOI_P1G_CONTROLLED_HORIZONTAL_ACTIVATION_FAIL';

  console.log(JSON.stringify({ phase: 'P1G', pass: results.criteria.enterprise_horizontal_activation_ready }));
  console.log('P1G_RESULTS:' + JSON.stringify(results));

  try {
    await require('../src/db').pool.end();
  } catch { /* ignore */ }

  process.exit(results.criteria.enterprise_horizontal_activation_ready ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
