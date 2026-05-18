'use strict';

const { ecosystemOperationalConsolidationRuntime } = require('../../ecosystem-correlation/ecosystemOperationalConsolidationRuntime');

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

console.log('\necosystem-operational-consolidation\n');
const pack = ecosystemOperationalConsolidationRuntime({ tenant_id: 't1' });
ok('consolidation object', !!pack.ecosystem_runtime);
ok('no auto promotion', pack.controlled_rollout?.auto_promotion === false);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
