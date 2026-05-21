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

function main() {
  console.log('KPI Blindness — Phase Z.7');
  process.env.IMPETUS_KPI_CONVERGENCE_OBSERVABILITY = 'on';
  const b = loadFresh('../../src/kpiBlindness/kpiBlindnessFacade');
  const exec = b.detectKpiBlindness([], { hierarchy_tier: 'executive' });
  assert(exec.critical_blind_spot === true, 'executive blind spot');
  const op = b.detectKpiBlindness([{ key: 'x', domain: 'hr' }], { hierarchy_tier: 'operational' });
  assert(op.operational.blind_spot === true, 'operational blind spot');
  assert(op.recovery.auto_remediate === false, 'no auto remediate');
  assert(op.fabricated === false, 'no fabrication');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
