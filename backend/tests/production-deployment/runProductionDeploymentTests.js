'use strict';

/**
 * npm run test:production-deployment
 */

const path = require('path');

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

function resetDeployment() {
  delete process.env.IMPETUS_PRODUCTION_DEPLOYMENT;
  delete process.env.IMPETUS_DEPLOYMENT_VALIDATION;
  delete process.env.IMPETUS_SAFE_RELOAD_COORDINATION;
  process.env.IMPETUS_DEPLOYMENT_OBSERVABILITY = 'on';
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/productionDeployment/')) delete require.cache[key];
  }
  loadFresh('../../src/productionDeployment/productionDeploymentTelemetry').resetDeploymentTelemetry();
}

function testFeatureFlags() {
  console.log('\n=== Feature flags ===');
  resetDeployment();
  const f = loadFresh('../../src/productionDeployment/config/productionDeploymentFeatureFlags');
  assert(f.isProductionDeploymentEnabled() === false, 'deployment off');
  assert(f.isDeploymentObservabilityEnabled() === true, 'observability on');
}

function testApprovedByRequired() {
  console.log('\n=== approved_by required ===');
  resetDeployment();
  const orch = loadFresh('../../src/productionDeployment/productionDeploymentOrchestrator');
  const r = orch.orchestrateProductionDeploy({ dry_run: true });
  assert(r.ok === false && /approved_by/.test(r.error), 'blocks without approver');
}

function testExecuteRequired() {
  console.log('\n=== execute=true required ===');
  resetDeployment();
  const orch = loadFresh('../../src/productionDeployment/productionDeploymentOrchestrator');
  const r = orch.orchestrateProductionDeploy({ approved_by: 'ops@test', execute: false, dry_run: false });
  assert(r.ok === false && /execute/.test(r.error), 'blocks execute path');
}

function testDryRun() {
  console.log('\n=== Dry run ===');
  resetDeployment();
  const orch = loadFresh('../../src/productionDeployment/productionDeploymentOrchestrator');
  const r = orch.orchestrateProductionDeploy({
    approved_by: 'ops@test',
    dry_run: true,
    skip_http_check: true,
    skip_pm2_check: true,
    force: true
  });
  assert(r.ok === true && r.executed === false, 'dry ok');
  assert(r.auto_deploy === false, 'no auto deploy');
}

function testExecuteBlockedWhenOff() {
  console.log('\n=== Execute blocked (flag off) ===');
  resetDeployment();
  const orch = loadFresh('../../src/productionDeployment/productionDeploymentOrchestrator');
  const r = orch.orchestrateProductionDeploy({
    approved_by: 'ops@test',
    execute: true,
    dry_run: false,
    skip_http_check: true,
    skip_pm2_check: true,
    force: true
  });
  assert(r.executed === false, 'not executed');
  assert(/IMPETUS_PRODUCTION_DEPLOYMENT/.test(r.error || ''), 'flag blocks');
}

function testRuntimeValidation() {
  console.log('\n=== Runtime validation ===');
  resetDeployment();
  const val = loadFresh('../../src/productionDeployment/runtimeDeploymentValidator');
  const r = val.validateRuntimeDeployment({
    skip_http_check: true,
    skip_pm2_check: true,
    runtime_calibration: { tenant_stabilization: { stable: true }, calibration_score: 0.9 }
  });
  assert(r.validation_passed === true, 'validation passed');
}

function testRollbackSupervisor() {
  console.log('\n=== Rollback supervisor ===');
  resetDeployment();
  const sup = loadFresh('../../src/productionDeployment/deploymentRollbackSupervisor');
  const r = sup.superviseDeploymentRollback({
    validation: { validation_passed: true },
    allow_rollback_with_warnings: true
  });
  assert(r.auto_rollback === false, 'no auto rollback');
}

function testHealthConsolidator() {
  console.log('\n=== Health consolidator ===');
  resetDeployment();
  const h = loadFresh('../../src/productionDeployment/deploymentHealthConsolidator');
  const r = h.consolidateDeploymentHealth(
    { validation_passed: true, composite_score: 0.9, runtime_consistency: { score: 0.88 } },
    { rollback_ready: true }
  );
  assert(r.health_status === 'ready', 'ready health');
}

function testSafeReloadDry() {
  console.log('\n=== Safe reload (dry) ===');
  resetDeployment();
  const rel = loadFresh('../../src/productionDeployment/safeReloadCoordinator');
  const r = rel.coordinateSafeReload({ approved_by: 'ops', dry_run: true, skip_build: true });
  assert(r.executed === false, 'reload not executed');
}

function testFacadeReport() {
  console.log('\n=== Facade report ===');
  resetDeployment();
  const facade = loadFresh('../../src/productionDeployment/productionDeploymentFacade');
  const r = facade.getDeploymentReport({
    skip_http_check: true,
    skip_pm2_check: true,
    force: true
  });
  assert(r.auto_deploy === false && r.auto_rollback === false, 'supervised');
  assert(r.status.layer === 'production-deployment', 'layer id');
}

function main() {
  console.log('Production Deployment Orchestrator');
  testFeatureFlags();
  testApprovedByRequired();
  testExecuteRequired();
  testDryRun();
  testExecuteBlockedWhenOff();
  testRuntimeValidation();
  testRollbackSupervisor();
  testHealthConsolidator();
  testSafeReloadDry();
  testFacadeReport();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
