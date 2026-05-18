'use strict';

const { ecosystemCrossDomainRuntime } = require('../../ecosystem-correlation/ecosystemCrossDomainRuntime');

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

console.log('\necosystem-cross-domain-validation\n');
const pack = ecosystemCrossDomainRuntime({ production_rate: 80, emissions_co2: 30 });
ok('bounded', pack.bounded_context_safe === true);
ok('density score', typeof pack.ecosystem_cross_domain_density_score === 'number');
ok('linked domains legacy', Array.isArray(pack.legacy_environment_correlation?.linked_domains));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
