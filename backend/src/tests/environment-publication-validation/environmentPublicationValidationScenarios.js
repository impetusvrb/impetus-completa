'use strict';

const { environmentPublicationValidationRuntime } = require('../../domains/environment/publication');
const multi = require('../../enterprise-shadow-stabilization/multiDomainPublicationValidator');

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

console.log('\nenvironment-publication-validation\n');

const md = multi.validateMultiDomainPublication();
ok('four domain pipeline', md.pipeline_order.length === 4);

const v = environmentPublicationValidationRuntime({
  user: { company_id: '00000000-0000-4000-8000-000000000001', role: 'coordenador' },
  tenant_id: '00000000-0000-4000-8000-000000000001'
});
ok('validation bounded', v.bounded === true);
ok('publication domain', v.publication.domain === 'environment');

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
