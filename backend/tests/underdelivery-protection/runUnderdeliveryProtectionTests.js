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
  console.log('Underdelivery Protection — Phase Z.3');
  process.env.IMPETUS_PILOT_RUNTIME_OBSERVABILITY = 'on';
  const u = loadFresh('../../src/underdeliveryProtection/underdeliveryProtectionFacade');
  const exec = u.protectAgainstUnderdelivery(['dashboard', 'settings', 'biblioteca', 'ai'], {
    canonical_identity: { hierarchy_tier: 'executive' }
  });
  assert(exec.hierarchy.minimum_met !== false, 'executive minimum');
  const op = u.protectAgainstUnderdelivery(['dashboard'], {
    canonical_identity: { hierarchy_tier: 'operational', hierarchy_level: 5 }
  });
  assert(op.risk.critical_underdelivery === true, 'operator critical');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
