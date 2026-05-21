'use strict';

let passed = 0;
let failed = 0;
function assert(c, m) {
  if (c) {
    passed++;
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
  }
}
const v = require('../../src/operationalValidation/summaryGovernanceValidator');
const bleed = v.validateSummaryGovernance({ summary: 'APR e LOTO em SST' }, { domain_axis: 'quality' });
assert(bleed.summary_cross_domain_detected, 'sst in quality');
const ok = v.validateSummaryGovernance({ summary: 'Inspeções e CAPA em dia' }, { domain_axis: 'quality' });
assert(!ok.summary_cross_domain_detected, 'quality summary ok');
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
