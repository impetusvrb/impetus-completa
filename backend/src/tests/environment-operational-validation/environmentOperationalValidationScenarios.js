'use strict';

const validation = require('../../domains/environment/operational/validation/environmentOperationalValidationRuntime');

let passed = 0;
let failed = 0;

function ok(label, cond) {
  if (cond) {
    console.log(`  OK ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}`);
    failed++;
  }
}

console.log('\nenvironment-operational-validation (backend)\n');

const pack = validation.runEnvironmentOperationalValidation({ tenant_id: 't1' });
ok('pack ok', pack.ok === true);
ok('ux mobile safe', pack.ux_validation?.mobile_safe === true);
ok('no publication recursion', pack.ux_validation?.publication_recursion_risk === false);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
