'use strict';

/**
 * npm run test:governance-production-bootstrap
 */

const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function assert(c, m, d) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
    if (d) console.log('       ', JSON.stringify(d).slice(0, 300));
  }
}

function loadFresh(p) {
  const r = require.resolve(p);
  delete require.cache[r];
  return require(p);
}

function testPreDeployAudit() {
  console.log('\n=== Pre-deploy audit ===');
  const audit = loadFresh('../../src/governanceBootstrap/preDeployGovernanceAudit');
  const r = audit.runPreDeployAudit();
  assert(r.modules.length >= 6, 'modules checked');
  assert(r.internal_route_guards.ok === true, 'internal guards', r.internal_route_guards);
}

function testBootstrapFlagPlan() {
  console.log('\n=== Bootstrap flag plan ===');
  const coord = loadFresh('../../src/governanceBootstrap/governanceBootstrapCoordinator');
  const plan = coord.getBootstrapFlagPlan();
  assert(plan.activate.IMPETUS_GOVERNANCE_SHADOW_MODE === 'on', 'shadow on');
  assert(plan.keep_off.IMPETUS_CHAT_GOVERNANCE === 'off', 'chat off');
  assert(plan.auto_apply === false, 'no auto apply');
}

function testShadowCollector() {
  console.log('\n=== Shadow collector ===');
  process.env.IMPETUS_GLOBAL_SHADOW_OBSERVATION = 'on';
  const col = loadFresh('../../src/governanceBootstrap/governanceShadowRuntimeCollector');
  col.clearForTests();
  const r = col.recordDivergence('kpi', { test: true });
  assert(r.recorded === true, 'divergence recorded');
  const sum = col.getAggregateSummary();
  assert(sum.shadow_divergence.count >= 1, 'aggregate has divergence');
}

function testEntrypointMap() {
  console.log('\n=== Entrypoint map ===');
  const mapper = loadFresh('../../src/governanceBootstrap/governanceEntrypointMapper');
  const map = mapper.mapEntrypoints({ live: true });
  assert(map.total >= 10, 'entrypoints mapped');
  assert(map.entries.some((e) => e.id === 'dashboard_chat'), 'chat entrypoint');
}

function testSoftKpiEvaluator() {
  console.log('\n=== Soft KPI evaluator ===');
  const ev = loadFresh('../../src/governanceBootstrap/softKpiActivationEvaluator');
  const r = ev.evaluateSoftKpiActivation({ force: true });
  assert(r.hard_enforcement === false, 'no hard enforcement');
  assert(r.recommendation.auto_execute === false, 'no auto execute');
  assert(typeof r.safe === 'boolean', 'safe boolean');
}

function testBootstrapStatus() {
  console.log('\n=== Bootstrap status ===');
  process.env.IMPETUS_GOVERNANCE_BOOTSTRAP_ACTIVE = 'on';
  const coord = loadFresh('../../src/governanceBootstrap/governanceBootstrapCoordinator');
  const status = coord.getBootstrapStatus({ force: true });
  assert(status.mode === 'shadow_observability_first', 'shadow mode');
  assert(status.hard_enforcement === false, 'hard enforcement off');
  assert(status.global_governance_enforced === false, 'not global enforced');
}

function testBootstrapReport() {
  console.log('\n=== Bootstrap report ===');
  const rep = loadFresh('../../src/governanceBootstrap/governanceBootstrapReporter');
  const report = rep.generateBootstrapReport({ force: true });
  assert(report.hard_enforcement_active === false, 'report confirms soft');
  assert(report.deploy_status, 'deploy status set');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  const dir = path.join(__dirname, 'snapshots');
  fs.mkdirSync(dir, { recursive: true });
  process.env.IMPETUS_GOVERNANCE_BOOTSTRAP_ACTIVE = 'on';
  const coord = loadFresh('../../src/governanceBootstrap/governanceBootstrapCoordinator');
  const rep = loadFresh('../../src/governanceBootstrap/governanceBootstrapReporter');
  fs.writeFileSync(
    path.join(dir, 'bootstrap_status.json'),
    JSON.stringify(coord.getBootstrapStatus({ force: true }), null, 2)
  );
  fs.writeFileSync(
    path.join(dir, 'bootstrap_report.json'),
    JSON.stringify(rep.generateBootstrapReport({ force: true }), null, 2)
  );
  console.log('  SNAP  bootstrap_status.json');
  console.log('  SNAP  bootstrap_report.json');
}

function main() {
  console.log('Governance Production Bootstrap Tests');
  testPreDeployAudit();
  testBootstrapFlagPlan();
  testShadowCollector();
  testEntrypointMap();
  testSoftKpiEvaluator();
  testBootstrapStatus();
  testBootstrapReport();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
