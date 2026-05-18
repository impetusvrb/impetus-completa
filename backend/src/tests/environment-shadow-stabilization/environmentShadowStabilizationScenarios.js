'use strict';

const multi = require('../../enterprise-shadow-stabilization/multiDomainPublicationValidator');
const { environmentPublicationValidationRuntime } = require('../../domains/environment/publication');

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

console.log('\nenvironment-shadow-stabilization (backend)\n');

const md = multi.validateMultiDomainPublication();
ok('environment in pipeline', md.pipeline_order.includes('environment'));
ok('bounded publication', md.bounded_publication === true);
ok('environment domain flags object', !!md.domains.environment);

const validation = environmentPublicationValidationRuntime({
  user: { company_id: 't1', role: 'operador' },
  tenant_id: 't1'
});
ok('validation shadow_only', validation.shadow_only === true);
ok('no auto promotion in publication pack', validation.publication.auto_promotion === false);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
