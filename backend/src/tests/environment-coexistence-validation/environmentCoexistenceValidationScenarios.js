'use strict';

const multi = require('../../domains/environment/pilot-rollout/environmentMultiDomainValidationRuntime');

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

console.log('\nenvironment-coexistence-validation\n');
const pack = multi.environmentMultiDomainValidationRuntime();
ok('coexistence ok', pack.ok === true);
ok('score', pack.environment_multi_domain_coexistence_score >= 0.9);
ok('pipeline', pack.publication.pipeline_order.includes('environment'));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
