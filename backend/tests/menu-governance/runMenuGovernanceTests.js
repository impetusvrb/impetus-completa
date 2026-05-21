'use strict';

let passed = 0;
let failed = 0;
function assert(c, m) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
  }
}
function loadFresh(p) {
  delete require.cache[require.resolve(p)];
  return require(p);
}

function testExecutiveIsolation() {
  console.log('\n=== Executivo sem cockpit operacional ===');
  const a = loadFresh('../../src/menuGovernance/executiveModuleIsolationAnalyzer');
  const r = a.analyzeExecutiveModuleIsolation({
    canonical_identity: { hierarchy_tier: 'executive' },
    visible_modules: ['dashboard', 'manuia', 'anomaly_detection']
  });
  assert(r.executive_isolation_ok === false, 'issues');
  assert(r.auto_hide === false, 'no hide');
}

function testRhSharedLeak() {
  console.log('\n=== RH shared leakage ===');
  const s = loadFresh('../../src/menuGovernance/sharedModuleLeakageAnalyzer');
  const r = s.analyzeSharedModuleLeakage({
    canonical_identity: { domain_axis: 'hr' },
    visible_modules: ['dashboard', 'operational', 'proaction', 'ai', 'chat']
  });
  assert(r.leakage_detected === true, 'shared pressure');
}

function testMenuFacade() {
  console.log('\n=== Menu facade ===');
  const f = loadFresh('../../src/menuGovernance/menuGovernanceFacade');
  const r = f.analyzeMenuGovernance({
    canonical_identity: { hierarchy_tier: 'operational', domain_axis: 'production' },
    visible_modules: ['dashboard', 'admin'],
    authority_registry: { governed_visible_modules: ['dashboard'] }
  });
  assert(r.auto_hide === false, 'observation only');
}

function main() {
  console.log('Menu Governance — Phase Z.0');
  testExecutiveIsolation();
  testRhSharedLeak();
  testMenuFacade();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
