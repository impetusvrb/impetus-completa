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
function reset() {
  process.env.IMPETUS_RUNTIME_OBSERVATION_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/runtimeObservation/') || k.includes('/phaseZ0/')) delete require.cache[k];
  }
}

function testRhSstLeakage() {
  console.log('\n=== RH não deve ver SST/emissões ===');
  reset();
  const obs = loadFresh('../../src/runtimeObservation/runtimeDeliveryLeakageObserver');
  const r = obs.observeDeliveryLeakage({
    functional_axis: 'hr',
    canonical_identity: { domain_axis: 'hr' },
    visible_modules: ['dashboard', 'hr_intelligence', 'environment_intelligence', 'safety_intelligence']
  });
  assert(r.leakage_detected === true, 'leakage');
  assert(r.auto_block === false, 'no block');
}

function testFacade() {
  console.log('\n=== Facade report ===');
  reset();
  const f = loadFresh('../../src/runtimeObservation/runtimeObservationFacade');
  const r = f.getRuntimeObservationReport({
    canonical_identity: { domain_axis: 'hr', tenant_id: 't1' },
    visible_modules: ['dashboard']
  });
  assert(r.ok && r.auto_remediate === false, 'report');
}

function main() {
  console.log('Runtime Observation — Phase Z.0');
  testRhSstLeakage();
  testFacade();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
