'use strict';

const { ecosystemCorrelationRuntime } = require('../../ecosystem-correlation');

let passed = 0;
let failed = 0;
function ok(l, c) {
  if (c) {
    console.log(`  OK ${l}`);
    passed++;
  } else {
    console.error(`  FAIL ${l}`);
    failed++;
  }
}

console.log('\necosystem-correlation-runtime\n');
const pack = ecosystemCorrelationRuntime({
  tenant_id: 't1',
  production_rate: 100,
  emissions_co2: 40,
  scrap_tonnes: 1
});
ok('framework', pack.framework === 'ecosystem_correlation');
ok('cross domain pairs', !!pack.cross_domain?.domain_pairs?.quality);
ok('safety pair', !!pack.cross_domain?.domain_pairs?.safety);
ok('logistics pair', !!pack.cross_domain?.domain_pairs?.logistics);
ok('production pair', !!pack.cross_domain?.domain_pairs?.production);
ok('maintenance pair', !!pack.cross_domain?.domain_pairs?.maintenance);
ok('telemetry', !!pack.telemetry);
ok('executive narratives', Array.isArray(pack.executive?.narratives));
ok('validation', pack.validation?.shadow_first === true);
ok('no auto promotion', pack.auto_promotion === false);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
