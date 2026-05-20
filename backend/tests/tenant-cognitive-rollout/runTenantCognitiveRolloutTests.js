'use strict';

/**
 * npm run test:tenant-cognitive-rollout
 */

let passed = 0;
let failed = 0;

function assert(c, m, d) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
    if (d) console.log('       ', JSON.stringify(d).slice(0, 400));
  }
}

function loadFresh(p) {
  const r = require.resolve(p);
  delete require.cache[r];
  return require(p);
}

function resetAll() {
  delete process.env.IMPETUS_TENANT_COGNITIVE_ROLLOUT;
  delete process.env.IMPETUS_TENANT_ROLLOUT_ACTIVATION;
  process.env.IMPETUS_TENANT_ROLLOUT_OBSERVABILITY = 'on';
  for (const key of Object.keys(require.cache)) {
    if (
      key.includes('/tenantRollout/') ||
      key.includes('/controlledActivation/channelActivationGovernance') ||
      key.includes('/kpiRollout/tenantKpiIsolation') ||
      key.includes('/summaryRollout/tenantSummaryIsolation')
    ) {
      delete require.cache[key];
    }
  }
  const tel = loadFresh('../../src/tenantRollout/tenantRolloutTelemetry');
  tel.resetTenantRolloutTelemetry();
  const st = loadFresh('../../src/tenantRollout/tenantRolloutState');
  st.clearTenantRolloutState();
  try {
    loadFresh('../../src/controlledActivation/channelActivationGovernance').resetChannelActivation();
  } catch {
    /* optional */
  }
  try {
    require('../../src/kpiRollout/tenantKpiIsolation').clearTenantKpiState();
  } catch {
    /* optional */
  }
  try {
    require('../../src/summaryRollout/tenantSummaryIsolation').clearTenantSummaryState();
  } catch {
    /* optional */
  }
}

function rolloutState() {
  return require('../../src/tenantRollout/tenantRolloutState');
}

function testSequenceOrder() {
  console.log('\n=== Channel sequence KPI → Summary → Chat ===');
  resetAll();
  const coord = loadFresh('../../src/tenantRollout/tenantActivationCoordinator');
  const r = coord.canActivateChannelForTenant('t1', 'summary', {});
  assert(r.allowed === false && r.expected_next === 'kpi', 'summary blocked before kpi');
}

function testKpiActivationPrepared() {
  console.log('\n=== KPI prepared (no execute) ===');
  resetAll();
  const sup = loadFresh('../../src/tenantRollout/tenantRolloutSupervisor');
  const r = sup.activateTenantRollout('t-kpi', { company_id: 't-kpi' }, { approved_by: 'ops@test' });
  assert(r.activation?.prepared === true, 'prepared');
  assert(r.activation?.auto_activation === false, 'no auto');
}

function testKpiActivationExecute() {
  console.log('\n=== KPI execute ===');
  resetAll();
  process.env.IMPETUS_TENANT_ROLLOUT_ACTIVATION = 'on';
  const sup = loadFresh('../../src/tenantRollout/tenantRolloutSupervisor');
  const r = sup.activateTenantRollout(
    't-exec',
    { company_id: 't-exec' },
    {
      approved_by: 'ops@test',
      execute: true,
      force_activation: true,
      force_readiness: true,
      kpi_payload: { kpis: [] }
    }
  );
  assert(r.activation?.active?.includes('kpi') || r.active_channels?.includes('kpi'), 'kpi active');
}

function testSummaryRequiresKpi() {
  console.log('\n=== Summary after KPI ===');
  resetAll();
  rolloutState().setTenantChannelActive('t2', 'kpi', true, { approved_by: 'x' });
  const coord = loadFresh('../../src/tenantRollout/tenantActivationCoordinator');
  const r = coord.canActivateChannelForTenant('t2', 'summary', { health: { healthy: true } });
  assert(r.allowed === true, 'summary allowed after kpi');
}

function testGovernanceHealth() {
  console.log('\n=== Governance health ===');
  resetAll();
  const h = loadFresh('../../src/tenantRollout/tenantGovernanceHealth');
  const r = h.measureTenantGovernanceHealth('t-h', {
    kpi_governance: { leakage: { detected: true, count: 1 } }
  });
  assert(r.leakage.detected === true, 'leakage');
}

function testRuntimeObservation() {
  console.log('\n=== Runtime observation ===');
  resetAll();
  const obs = loadFresh('../../src/tenantRollout/tenantRuntimeObservation');
  const r = obs.observeTenantRuntime('t-o', {
    runtime_calibration: { critical_tenant: true },
    tenant_stabilization: { stable: false }
  });
  assert(r.anomalies.length >= 2, 'anomalies');
}

function testRollbackReadiness() {
  console.log('\n=== Rollback readiness ===');
  resetAll();
  const st = rolloutState();
  st.setTenantChannelActive('t-r', 'kpi', true);
  st.setTenantChannelActive('t-r', 'summary', true);
  const rb = loadFresh('../../src/tenantRollout/tenantRollbackReadiness');
  const r = rb.assessTenantRollbackReadiness('t-r', { healthy: true });
  assert(r.rollback_plan.sequence.length === 2, 'rollback sequence');
  assert(r.rollback_plan.auto_rollback === false, 'no auto rollback');
}

function testSupervisorStable() {
  console.log('\n=== Supervisor stable tenant ===');
  resetAll();
  const sup = loadFresh('../../src/tenantRollout/tenantRolloutSupervisor');
  const r = sup.superviseTenantRollout('t-stable', null, { force: true });
  assert(r.next_channel === 'kpi', 'next is kpi');
  assert(r.auto_activation === false, 'supervised');
}

function testDeactivateRequiresExecute() {
  console.log('\n=== Deactivate prepared ===');
  resetAll();
  rolloutState().setTenantChannelActive('t-d', 'kpi', true);
  const sup = loadFresh('../../src/tenantRollout/tenantRolloutSupervisor');
  const r = sup.deactivateTenantRollout('t-d', { approved_by: 'ops' });
  assert(r.deactivation?.prepared === true, 'deactivate prepared');
}

function testFlags() {
  console.log('\n=== Feature flags ===');
  resetAll();
  const f = loadFresh('../../src/tenantRollout/config/tenantRolloutFeatureFlags');
  assert(f.isTenantCognitiveRolloutEnabled() === false, 'rollout off');
  assert(f.isTenantRolloutObservabilityEnabled() === true, 'obs on');
}

function main() {
  console.log('Tenant Cognitive Rollout Supervisor');
  testSequenceOrder();
  testKpiActivationPrepared();
  testKpiActivationExecute();
  testSummaryRequiresKpi();
  testGovernanceHealth();
  testRuntimeObservation();
  testRollbackReadiness();
  testSupervisorStable();
  testDeactivateRequiresExecute();
  testFlags();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
