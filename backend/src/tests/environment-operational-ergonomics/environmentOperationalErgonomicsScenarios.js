'use strict';

const erg = require('../../domains/environment/pilot-rollout/environmentOperationalErgonomicsRuntime');

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

console.log('\nenvironment-operational-ergonomics\n');
const pack = erg.environmentOperationalErgonomicsRuntime();
ok('acceptable default profiles', pack.acceptable === true);
const bad = erg.environmentOperationalErgonomicsValidator({ band: 'operator', click_density: 40, navigation_depth: 8, menu_item_count: 20 });
ok('detect excess', bad.acceptable === false);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
