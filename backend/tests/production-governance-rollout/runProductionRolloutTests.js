'use strict';

/**
 * Etapa Final C — Production Governance Rollout
 * npm run test:production-governance-rollout
 */

const path = require('path');
const fs = require('fs');

const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');
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

function enableProductionC() {
  process.env.IMPETUS_PRODUCTION_ROLLOUT = 'on';
  process.env.IMPETUS_GOVERNANCE_STABILIZATION = 'on';
  process.env.IMPETUS_RUNTIME_OBSERVATION = 'on';
  process.env.IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION = 'on';
  process.env.IMPETUS_GOVERNANCE_QUALITY_GATES = 'on';
  process.env.IMPETUS_GOVERNANCE_READINESS = 'on';
  process.env.IMPETUS_TENANT_SAFE_GOVERNANCE = 'on';
  process.env.IMPETUS_GOVERNANCE_SHADOW_MODE = 'on';
  process.env.IMPETUS_FAILSAFE_GOVERNANCE = 'on';
  delete require.cache[require.resolve('../../src/productionRollout/config/productionRolloutFeatureFlags')];
  delete require.cache[require.resolve('../../src/governanceActivation/config/phaseIFeatureFlags')];
}

const METRICS = {
  shadow_alignment_rate: 0.96,
  governance_confidence_score: 0.9,
  governance_false_positive_rate: 0.02,
  governance_overblocking_rate: 0.04,
  governance_context_preservation_rate: 0.92,
  drift_stability: 'stable'
};

function testRolloutSequencing() {
  console.log('\n=== Rollout sequencing ===');
  enableProductionC();
  const seq = resetRolloutState();
  assert(seq.canPromoteChannel('kpi').allowed === true, 'kpi first allowed');
  assert(seq.canPromoteChannel('summary').allowed === false, 'summary blocked before kpi');
  seq.recordChannelPromoted('kpi');
  assert(seq.canPromoteChannel('summary').allowed === true, 'summary after kpi');
}

function resetRolloutState() {
  delete require.cache[require.resolve('../../src/productionRollout/activationSequenceController')];
  const seq = loadFresh('../../src/productionRollout/activationSequenceController');
  seq.resetSequenceForTests();
  return seq;
}

function promoteChannel(channel, coordinator, rt, iso, opts = {}) {
  if (opts.resetSequence) resetRolloutState();
  if (opts.resetRuntime !== false) {
    rt.resetRuntimeForTests();
    iso.clearAllForTests();
  }
  delete require.cache[require.resolve('../../src/productionRollout/productionRolloutCoordinator')];
  coordinator = loadFresh('../../src/productionRollout/productionRolloutCoordinator');
  return coordinator.promoteChannelInSequence(channel, {
    force: true,
    execute: true,
    approved_by: 'test-op',
    metrics: METRICS
  });
}

function testKpiActivationSafety() {
  console.log('\n=== KPI activation safety ===');
  enableProductionC();
  process.env.IMPETUS_TENANT_SAFE_GOVERNANCE = 'off';
  resetRolloutState();
  const rt = loadFresh('../../src/governanceActivation/governanceActivationRuntime');
  const iso = loadFresh('../../src/governanceActivation/tenantActivationIsolation');
  const coordinator = loadFresh('../../src/productionRollout/productionRolloutCoordinator');
  const result = promoteChannel('kpi', coordinator, rt, iso);
  assert(result.promoted === true, 'kpi promoted', result);
  assert(result.auto_executed === false, 'not auto executed');
}

function testSummaryActivationSafety() {
  console.log('\n=== Summary activation safety ===');
  enableProductionC();
  process.env.IMPETUS_TENANT_SAFE_GOVERNANCE = 'off';
  resetRolloutState();
  const rt = loadFresh('../../src/governanceActivation/governanceActivationRuntime');
  const iso = loadFresh('../../src/governanceActivation/tenantActivationIsolation');
  let coordinator = loadFresh('../../src/productionRollout/productionRolloutCoordinator');
  promoteChannel('kpi', coordinator, rt, iso, { resetRuntime: false });
  coordinator = loadFresh('../../src/productionRollout/productionRolloutCoordinator');
  const result = promoteChannel('summary', coordinator, rt, iso, { resetRuntime: false });
  assert(result.promoted === true, 'summary promoted after kpi', result);
}

function testChatActivationSafety() {
  console.log('\n=== Chat activation safety ===');
  enableProductionC();
  process.env.IMPETUS_TENANT_SAFE_GOVERNANCE = 'off';
  resetRolloutState();
  const rt = loadFresh('../../src/governanceActivation/governanceActivationRuntime');
  const iso = loadFresh('../../src/governanceActivation/tenantActivationIsolation');
  let coordinator = loadFresh('../../src/productionRollout/productionRolloutCoordinator');
  promoteChannel('kpi', coordinator, rt, iso, { resetRuntime: false });
  promoteChannel('summary', coordinator, rt, iso, { resetRuntime: false });
  coordinator = loadFresh('../../src/productionRollout/productionRolloutCoordinator');
  const result = promoteChannel('chat', coordinator, rt, iso, { resetRuntime: false });
  assert(result.promoted === true, 'chat promoted', result);
}

function testBoundaryActivationSafety() {
  console.log('\n=== Boundary activation safety ===');
  enableProductionC();
  process.env.IMPETUS_TENANT_SAFE_GOVERNANCE = 'off';
  resetRolloutState();
  const rt = loadFresh('../../src/governanceActivation/governanceActivationRuntime');
  const iso = loadFresh('../../src/governanceActivation/tenantActivationIsolation');
  let coordinator = loadFresh('../../src/productionRollout/productionRolloutCoordinator');
  for (const ch of ['kpi', 'summary', 'chat']) {
    promoteChannel(ch, coordinator, rt, iso, { resetRuntime: false });
    coordinator = loadFresh('../../src/productionRollout/productionRolloutCoordinator');
  }
  const result = promoteChannel('boundary', coordinator, rt, iso, { resetRuntime: false });
  assert(result.promoted === true, 'boundary promoted', result);
}

function testPm2ReloadSafety() {
  console.log('\n=== PM2 reload safety ===');
  enableProductionC();
  const reload = loadFresh('../../src/productionRollout/governanceReloadCoordinator');
  const plan = reload.planPm2Reload({ approved_by: 'test' });
  assert(plan.auto_executed === false, 'pm2 not auto executed');
  assert(plan.rebuild_required === false, 'no rebuild required');
  assert(plan.sequence.some((s) => s.command?.includes('pm2 reload')), 'pm2 command in plan');
}

function testRollbackReadinessValidation() {
  console.log('\n=== Rollback readiness validation ===');
  enableProductionC();
  const verify = loadFresh('../../src/productionRollout/governanceRollbackVerification');
  const v = verify.verifyRollbackReadiness({ scope: 'phase_f_only' });
  assert(v.verified === true, 'rollback verified');
  assert(v.auto_rollback === false, 'no auto rollback');
  assert(Array.isArray(v.env_flags_off), 'env flags listed');
}

function testTenantSafeRollout() {
  console.log('\n=== Tenant-safe rollout ===');
  enableProductionC();
  const tenant = loadFresh('../../src/productionRollout/tenantRolloutCoordinator');
  const plan = tenant.planTenantRollout('tenant-c1', { channel: 'kpi', force: true });
  assert(plan.tenant_id === 'tenant-c1', 'tenant scoped');
  assert(plan.auto_executed === false, 'tenant plan manual');
}

function testProductionRuntimeValidation() {
  console.log('\n=== Production runtime validation ===');
  enableProductionC();
  const validation = loadFresh('../../src/productionRollout/productionRolloutValidation');
  const v = validation.validateProductionRollout({ force: true });
  assert(v.valid === true, 'production rollout valid', v);
}

function testStabilizationIntegrity() {
  console.log('\n=== Stabilization integrity ===');
  enableProductionC();
  const stab = loadFresh('../../src/productionRollout/governanceStabilizationMonitor');
  stab.clearForTests();
  stab.recordStabilizationSample({ degraded: false, overblocking: false });
  const m = stab.computeStabilizationMetrics({ force: true });
  assert(typeof m.stabilization_score === 'number', 'stabilization score');
  assert(m.stabilization_score >= 0.8, 'stable sample', m);
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  enableProductionC();
  const coordinator = loadFresh('../../src/productionRollout/productionRolloutCoordinator');
  const seq = loadFresh('../../src/productionRollout/activationSequenceController');
  const stab = loadFresh('../../src/productionRollout/governanceStabilizationMonitor');
  const verify = loadFresh('../../src/productionRollout/governanceRollbackVerification');
  const tenant = loadFresh('../../src/productionRollout/tenantRolloutCoordinator');
  seq.resetSequenceForTests();

  const files = [
    ['rollout_sequence', () => seq.getSequenceState()],
    ['production_runtime_health', () => coordinator.getProductionStatus({ force: true })],
    ['stabilization_runtime', () => stab.computeStabilizationMetrics({ force: true })],
    ['tenant_rollout_validation', () => tenant.planTenantRollout('tenant-snap', { channel: 'kpi', force: true })],
    ['rollback_readiness', () => verify.verifyRollbackReadiness({ force: true })]
  ];

  for (const [name, fn] of files) {
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${name}.json`), JSON.stringify(fn(), null, 2));
    console.log(`  SNAP  ${name}.json`);
  }
}

function main() {
  console.log('Production Governance Rollout — Final C');
  testRolloutSequencing();
  testKpiActivationSafety();
  testSummaryActivationSafety();
  testChatActivationSafety();
  testBoundaryActivationSafety();
  testPm2ReloadSafety();
  testRollbackReadinessValidation();
  testTenantSafeRollout();
  testProductionRuntimeValidation();
  testStabilizationIntegrity();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
